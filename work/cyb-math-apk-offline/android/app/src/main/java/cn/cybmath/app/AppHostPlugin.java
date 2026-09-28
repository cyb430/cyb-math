package cn.cybmath.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

@CapacitorPlugin(name = "AppHost")
public class AppHostPlugin extends Plugin {
    @PluginMethod
    public void pageState(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!(getActivity() instanceof MainActivity)) { call.reject("Native host unavailable"); return; }
            ((MainActivity) getActivity()).nativeShell().pageState(call.getData());
            JSObject response = new JSObject();
            String pending = ((MainActivity) getActivity()).nativeShell().takePendingProject();
            if (pending != null) response.put("project", pending);
            call.resolve(response);
        });
    }

    @PluginMethod
    public void editorState(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).nativeShell().editorState(call.getData());
            call.resolve();
        });
    }

    @PluginMethod
    public void share(PluginCall call) {
        String text = call.getString("text", "");
        if (text.length() > 2000000) { call.reject("Share is too large; save a project instead"); return; }
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        try { getActivity().startActivity(Intent.createChooser(intent, "CYB Math")); call.resolve(); }
        catch (Exception error) { call.reject("Unable to share", error); }
    }

    @PluginMethod
    public void openProject(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "application/octet-stream" });
        try { startActivityForResult(call, intent, "projectSelected"); }
        catch (Exception error) { call.reject("Unable to open file picker", error); }
    }

    @ActivityCallback
    private void projectSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject response = new JSObject(); response.put("canceled", true); call.resolve(response); return;
        }
        execute(() -> {
            try (InputStream stream = getContext().getContentResolver().openInputStream(result.getData().getData()); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                if (stream == null) throw new IllegalStateException("File is unavailable");
                byte[] buffer = new byte[8192]; int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (bytes.size() + count > 12 * 1024 * 1024) throw new IllegalArgumentException("Project exceeds 12 MB");
                    bytes.write(buffer, 0, count);
                }
                JSObject response = new JSObject(); response.put("raw", bytes.toString(StandardCharsets.UTF_8.name())); call.resolve(response);
            } catch (Exception error) { call.reject("Unable to read project", error); }
        });
    }

    @PluginMethod
    public void handoff(PluginCall call) {
        String file = call.getString("file", "");
        String raw = call.getString("raw", "");
        if (raw.length() > 12 * 1024 * 1024 || !NativeShell.validFile(file)) { call.reject("Invalid project destination"); return; }
        try {
            JSONObject project = new JSONObject(raw);
            String site = project.getString("site");
            String expected = "cyb-math".equals(site) ? "index.html" : "math-geometry".equals(site) ? "math-geometry-theorems.html" : site + ".html";
            if (!"CYB-Math-Project".equals(project.getString("format")) || project.getInt("version") != 1 || !file.equals(expected)) throw new IllegalArgumentException("Project and tool do not match");
        } catch (Exception error) { call.reject("Invalid project destination", error); return; }
        getActivity().runOnUiThread(() -> {
            ((MainActivity) getActivity()).nativeShell().openProject(file, raw);
            call.resolve();
        });
    }
}
