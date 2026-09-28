package cn.cybmath.app;

import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

final class NativeShell {
    private static final String[] FILES = { "index.html", "math-tools-pro.html", "math-plotter.html", "math-complex.html", "math-equation.html", "math-geometry-theorems.html", "math-algebra.html", "math-linear.html", "math-3d.html", "math-theory.html", "math-sequence.html", "math-latex.html", "math-fourier.html" };
    private static final String[][] TITLES = {
        { "工具总览", "数学实用工具", "函数绘图", "复变函数", "方程求解", "几何画板", "代数", "线性代数", "3D 绘图", "数论", "数列", "LaTeX", "傅里叶" },
        { "工具總覽", "數學實用工具", "函數繪圖", "複變函數", "方程求解", "幾何畫板", "代數", "線性代數", "3D 繪圖", "數論", "數列", "LaTeX", "傅里葉" },
        { "All tools", "Quick Math", "Function Plotter", "Complex Functions", "Equations", "Geometry", "Algebra", "Linear Algebra", "3D Plotter", "Number Theory", "Sequences", "LaTeX", "Fourier" }
    };
    private final MainActivity activity;
    private final WebView web;
    private final SharedPreferences prefs;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private LinearLayout shell, header, keys;
    private HorizontalScrollView keyboard;
    private TextView title;
    private String language = "zh-Hans", file = "index.html", pendingProject;
    private boolean keyboardVisible, ready;
    private volatile boolean checkingUpdate;
    private int foreground = Color.BLACK;

    NativeShell(MainActivity activity) {
        this.activity = activity; this.web = activity.getBridge().getWebView();
        prefs = activity.getSharedPreferences("cyb-app", 0);
        language = prefs.getString("language", "zh-Hans");
        mount();
        String previous = prefs.getString("lastFile", "index.html");
        File saved = new File(activity.getFilesDir(), "last-project.json");
        if (saved.isFile() && saved.length() <= 12 * 1024 * 1024) {
            try (FileInputStream input = new FileInputStream(saved); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int count; while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
                String raw = bytes.toString(StandardCharsets.UTF_8.name());
                JSONObject data = new JSONObject(raw);
                String site = data.optString("site");
                String target = "cyb-math".equals(site) ? "index.html" : "math-geometry".equals(site) ? "math-geometry-theorems.html" : site + ".html";
                if ("CYB-Math-Project".equals(data.optString("format")) && data.optInt("version") == 1 && validFile(target)) { pendingProject = raw; previous = target; }
            } catch (Exception ignored) {}
        }
        if (validFile(previous) && !previous.equals("index.html")) web.loadUrl(localUrl(previous));
    }

    static boolean validFile(String value) { for (String file : FILES) if (file.equals(value)) return true; return false; }
    private int dp(int value) { return Math.round(value * activity.getResources().getDisplayMetrics().density); }
    private int lang() { return language.startsWith("en") ? 2 : language.contains("Hant") ? 1 : 0; }
    private String t(String hans, String hant, String english) { return new String[] { hans, hant, english }[lang()]; }
    private String localUrl(String target) { return "https://localhost/" + target + "?lang=" + language; }
    private ImageButton icon(int drawable, String label, Runnable action) {
        ImageButton button = new ImageButton(activity); button.setImageResource(drawable); button.setContentDescription(label);
        button.setBackgroundColor(Color.TRANSPARENT); button.setColorFilter(foreground); button.setFocusable(false);
        button.setOnClickListener(view -> action.run()); return button;
    }
    private void mount() {
        ViewGroup parent = (ViewGroup) web.getParent(); parent.removeView(web);
        shell = new LinearLayout(activity); shell.setOrientation(LinearLayout.VERTICAL);
        parent.addView(shell, new ViewGroup.LayoutParams(-1, -1));
        header = new LinearLayout(activity); header.setGravity(Gravity.CENTER_VERTICAL);
        shell.addView(header, new LinearLayout.LayoutParams(-1, dp(48)));
        header.addView(icon(R.drawable.ic_arrow_back_24, t("返回", "返回", "Back"), this::back), new LinearLayout.LayoutParams(dp(48), -1));
        title = new TextView(activity); title.setText("CYB Math"); title.setTextSize(16); title.setMaxLines(1); title.setEllipsize(android.text.TextUtils.TruncateAt.END); title.setGravity(Gravity.CENTER_VERTICAL);
        title.setContentDescription(t("切换数学工具", "切換數學工具", "Switch math tool")); title.setOnClickListener(view -> chooseTool());
        header.addView(title, new LinearLayout.LayoutParams(0, -1, 1));
        header.addView(icon(R.drawable.ic_menu_24, t("菜单", "選單", "Menu"), this::menu), new LinearLayout.LayoutParams(dp(48), -1));
        web.getSettings().setTextZoom(100);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        shell.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        keyboard = new HorizontalScrollView(activity); keyboard.setHorizontalScrollBarEnabled(false);
        keys = new LinearLayout(activity); keys.setGravity(Gravity.CENTER_VERTICAL);
        keyboard.addView(keys); keyboard.setVisibility(View.GONE);
        shell.addView(keyboard, new LinearLayout.LayoutParams(-1, dp(48)));
        WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), false);
        activity.getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        ViewCompat.setOnApplyWindowInsetsListener(shell, (view, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            shell.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(shell);
        colors(false);
    }

    private void colors(boolean dark) {
        foreground = dark ? Color.rgb(235, 237, 240) : Color.rgb(28, 30, 34);
        int background = dark ? Color.rgb(31, 33, 37) : Color.rgb(247, 248, 250);
        shell.setBackgroundColor(background);
        header.setBackgroundColor(background); keyboard.setBackgroundColor(background); title.setTextColor(foreground);
        for (int i = 0; i < header.getChildCount(); i++) if (header.getChildAt(i) instanceof ImageButton) ((ImageButton) header.getChildAt(i)).setColorFilter(foreground);
        WindowCompat.getInsetsController(activity.getWindow(), shell).setAppearanceLightStatusBars(!dark);
        WindowCompat.getInsetsController(activity.getWindow(), shell).setAppearanceLightNavigationBars(!dark);
    }

    void pageState(JSObject data) {
        String next = data.optString("file", "index.html");
        if (!validFile(next)) return;
        file = next; language = data.optString("language", "zh-Hans");
        if (!language.equals("en") && !language.equals("zh-Hant")) language = "zh-Hans";
        prefs.edit().putString("lastFile", file).putString("language", language).apply();
        int index = java.util.Arrays.asList(FILES).indexOf(file); title.setText(TITLES[lang()][index]);
        header.getChildAt(0).setContentDescription(t("返回", "返回", "Back"));
        title.setContentDescription(t("切换数学工具", "切換數學工具", "Switch math tool"));
        header.getChildAt(2).setContentDescription(t("菜单", "選單", "Menu"));
        colors(data.optBoolean("dark", false));
        if (!ready) { ready = true; checkUpdates(false); }
    }

    void editorState(JSObject data) {
        keyboardVisible = data.optBoolean("active", false);
        keyboard.setVisibility(keyboardVisible ? View.VISIBLE : View.GONE);
        if (!keyboardVisible) return;
        keys.removeAllViews(); JSONArray items = data.optJSONArray("keys");
        if (items == null || items.length() > 40) return;
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i); if (item == null) continue;
            String value = item.optString("value"); if (value.length() > 100) continue;
            Button button = new Button(activity); button.setText(item.optString("label")); button.setTextSize(16); button.setTextColor(foreground); button.setMinWidth(0); button.setMinimumWidth(0); button.setPadding(0, 0, 0, 0); button.setFocusable(false);
            button.setContentDescription(item.optString("label"));
            button.setOnClickListener(view -> evaluate("window.CYBEditor.insert(" + JSONObject.quote(value) + ")"));
            keys.addView(button, new LinearLayout.LayoutParams(dp(48), -1));
        }
        keys.addView(icon(android.R.drawable.ic_menu_close_clear_cancel, t("收起", "收起", "Hide"), () -> { hideKeyboard(); evaluate("document.activeElement.blur()"); }), new LinearLayout.LayoutParams(dp(48), -1));
    }

    private void chooseTool() {
        new AlertDialog.Builder(activity).setTitle(t("数学工具", "數學工具", "Math tools")).setItems(TITLES[lang()], (dialog, index) -> persist(() -> web.loadUrl(localUrl(FILES[index])))).setNegativeButton(t("取消", "取消", "Cancel"), null).show();
    }

    private void menu() {
        PopupMenu menu = new PopupMenu(activity, header.getChildAt(2));
        String[] options = { t("数学工具", "數學工具", "Math tools"), t("保存学习项目", "儲存學習專案", "Save project"), t("打开学习项目", "開啟學習專案", "Open project"), t("分享", "分享", "Share"), t("检查更新", "檢查更新", "Check for updates"), t("自动检查更新", "自動檢查更新", "Automatic updates"), t("语言", "語言", "Language"), t("切换主题", "切換主題", "Switch theme"), t("帮助", "說明", "Help") };
        for (int i = 0; i < options.length; i++) menu.getMenu().add(0, i, i, options[i]);
        menu.getMenu().findItem(5).setCheckable(true).setChecked(prefs.getBoolean("automaticUpdates", true));
        menu.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 0: chooseTool(); break;
                case 1: evaluate("window.CYBApp.saveProject()"); break;
                case 2: new AlertDialog.Builder(activity).setMessage(t("打开项目将替换当前输入，是否继续？", "開啟專案將取代目前輸入，是否繼續？", "Opening a project replaces the current inputs. Continue?" )).setNegativeButton(t("取消", "取消", "Cancel"), null).setPositiveButton(t("打开", "開啟", "Open"), (dialog, which) -> { persist(); evaluate("window.CYBApp.openProject()"); }).show(); break;
                case 3: evaluate("window.CYBApp.share()"); break;
                case 4: checkUpdates(true); break;
                case 5: prefs.edit().putBoolean("automaticUpdates", !item.isChecked()).apply(); break;
                case 6: new AlertDialog.Builder(activity).setTitle(t("语言", "語言", "Language")).setSingleChoiceItems(new String[] { "简体中文", "繁體中文", "English" }, lang(), (dialog, which) -> {
                    String next = new String[] { "zh-Hans", "zh-Hant", "en" }[which];
                    persist(() -> { language = next; web.loadUrl(localUrl(file)); }); dialog.dismiss();
                }).setNegativeButton(t("取消", "取消", "Cancel"), null).show(); break;
                case 7: evaluate("window.CYBToolAction('theme')"); break;
                case 8: evaluate("window.CYBToolAction('help')"); break;
                default: return false;
            }
            return true;
        }); menu.show();
    }

    void back() {
        if (keyboardVisible) { hideKeyboard(); evaluate("document.activeElement.blur()"); return; }
        web.evaluateJavascript("window.CYBApp?.closeOverlay() || false", result -> {
            if ("true".equals(result)) return;
            if (web.canGoBack()) { persist(web::goBack); }
            else new AlertDialog.Builder(activity).setMessage(t("关闭 CYB Math？输入会保留。", "關閉 CYB Math？輸入會保留。", "Close CYB Math? Inputs will be kept.")).setNegativeButton(t("取消", "取消", "Cancel"), null).setPositiveButton(t("关闭", "關閉", "Close"), (dialog, which) -> persist(activity::finish)).show();
        });
    }
    private void hideKeyboard() { keyboardVisible = false; keyboard.setVisibility(View.GONE); ((InputMethodManager) activity.getSystemService(android.content.Context.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(web.getWindowToken(), 0); }
    void evaluate(String script) { web.evaluateJavascript(script, null); }
    void persist() {
        persist(null);
    }
    void persist(Runnable after) {
        if (!ready) { if (after != null) after.run(); return; }
        web.evaluateJavascript("window.CYBSession?.snapshot()", result -> {
            try {
                String raw = new JSONArray("[" + result + "]").getString(0);
                if (raw.length() > 12 * 1024 * 1024) throw new IllegalStateException("Project exceeds limit");
                worker.execute(() -> {
                    File temporary = new File(activity.getFilesDir(), "last-project.tmp");
                    try {
                        try (FileOutputStream output = new FileOutputStream(temporary)) { output.write(raw.getBytes(StandardCharsets.UTF_8)); output.getFD().sync(); }
                        java.nio.file.Files.move(temporary.toPath(), new File(activity.getFilesDir(), "last-project.json").toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    } catch (Exception ignored) {}
                    if (after != null) activity.runOnUiThread(after);
                });
            } catch (Exception ignored) { if (after != null) after.run(); }
        });
    }
    String takePendingProject() {
        String raw = pendingProject; pendingProject = null; return raw;
    }
    void openProject(String target, String raw) { pendingProject = raw; web.loadUrl(localUrl(target)); }

    private void checkUpdates(boolean manual) {
        if (checkingUpdate || !manual && (!prefs.getBoolean("automaticUpdates", true) || System.currentTimeMillis() - prefs.getLong("lastCheck", 0) < 86400000)) return;
        checkingUpdate = true;
        worker.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL("https://api.github.com/repos/cyb430/cyb-math/releases/latest").openConnection();
                connection.setConnectTimeout(8000); connection.setReadTimeout(8000); connection.setRequestProperty("User-Agent", "CYB-Math"); connection.setInstanceFollowRedirects(false);
                if (connection.getResponseCode() != 200) throw new IllegalStateException("Update server unavailable");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (java.io.InputStream input = connection.getInputStream()) { byte[] buffer = new byte[8192]; int count; while ((count = input.read(buffer)) != -1) { if (bytes.size() + count > 1024 * 1024) throw new IllegalStateException("Update metadata too large"); bytes.write(buffer, 0, count); } }
                JSONObject release = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name())); JSONArray assets = release.getJSONArray("assets"); String version = null;
                if (release.optBoolean("draft") || release.optBoolean("prerelease")) throw new IllegalStateException("Unpublished release");
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("CYB-Math-Android-(\\d+\\.\\d+\\.\\d+)\\.apk");
                for (int i = 0; i < assets.length(); i++) { java.util.regex.Matcher match = pattern.matcher(assets.getJSONObject(i).optString("name")); if (match.matches()) version = match.group(1); }
                if (version == null) throw new IllegalStateException("Missing Android release");
                prefs.edit().putLong("lastCheck", System.currentTimeMillis()).apply();
                String next = version; String current = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
                if (!newer(next, current)) { if (manual) toast(t("已是最新版本", "已是最新版本", "You are up to date")); return; }
                if (!manual && next.equals(prefs.getString("ignoredVersion", ""))) return;
                String tag = release.getString("tag_name");
                activity.runOnUiThread(() -> {
                    if (activity.isFinishing()) return;
                    new AlertDialog.Builder(activity).setTitle(t("发现新版本", "發現新版本", "Update available")).setMessage(current + " → " + next)
                        .setPositiveButton(t("前往下载", "前往下載", "Download"), (dialog, which) -> activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/cyb430/cyb-math/releases/tag/" + Uri.encode(tag)))))
                        .setNegativeButton(t("稍后", "稍後", "Later"), null).setNeutralButton(t("忽略此版本", "忽略此版本", "Ignore version"), (dialog, which) -> prefs.edit().putString("ignoredVersion", next).apply()).show();
                });
            } catch (Exception ignored) { if (manual) toast(t("无法检查更新，离线计算仍可使用", "無法檢查更新，離線計算仍可使用", "Unable to check. Offline tools remain available.")); }
            finally { if (connection != null) connection.disconnect(); checkingUpdate = false; }
        });
    }
    static boolean newer(String a, String b) { String[] x = a.split("\\."), y = b.split("\\."); for (int i = 0; i < 3; i++) { int left = Integer.parseInt(x[i]), right = Integer.parseInt(y[i]); if (left != right) return left > right; } return false; }
    private void toast(String text) { activity.runOnUiThread(() -> Toast.makeText(activity, text, Toast.LENGTH_LONG).show()); }
    void destroy() { worker.shutdown(); }
}
