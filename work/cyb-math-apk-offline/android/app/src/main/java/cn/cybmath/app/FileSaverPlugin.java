package cn.cybmath.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {
    private static final int MAX_EXPORT_BYTES = 50 * 1024 * 1024;

    @PluginMethod
    public void save(PluginCall call) {
        final String requestedName = call.getString("fileName", "CYB-Math-export");
        final String mimeType = call.getString("mimeType", "application/octet-stream");
        final String encoded = call.getString("base64");
        if (encoded == null) {
            call.reject("Missing export data");
            return;
        }

        execute(() -> {
            try {
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                if (bytes.length > MAX_EXPORT_BYTES) throw new IllegalArgumentException("Export exceeds 50 MB limit");
                String fileName = sanitizeFileName(requestedName);
                String destination = saveBytes(fileName, mimeType, bytes);
                JSObject result = new JSObject();
                result.put("path", destination);
                call.resolve(result);
                getActivity().runOnUiThread(() -> Toast.makeText(getContext(), "已保存到下载目录：" + fileName, Toast.LENGTH_LONG).show());
            } catch (Exception error) {
                call.reject("Unable to save export", error);
                getActivity().runOnUiThread(() -> Toast.makeText(getContext(), "导出失败，请重试", Toast.LENGTH_LONG).show());
            }
        });
    }

    private String saveBytes(String fileName, String mimeType, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/CYB Math");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IllegalStateException("Unable to create download");
            try (OutputStream stream = resolver.openOutputStream(uri)) {
                if (stream == null) throw new IllegalStateException("Unable to open download");
                stream.write(bytes);
            } catch (Exception error) {
                resolver.delete(uri, null, null);
                throw error;
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return uri.toString();
        }

        File base = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (base == null) throw new IllegalStateException("Downloads directory is unavailable");
        File directory = new File(base, "CYB Math");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Unable to create downloads directory");
        File output = uniqueFile(directory, fileName);
        try (FileOutputStream stream = new FileOutputStream(output)) {
            stream.write(bytes);
        }
        return output.getAbsolutePath();
    }

    private static File uniqueFile(File directory, String name) {
        File candidate = new File(directory, name);
        if (!candidate.exists()) return candidate;
        int dot = name.lastIndexOf('.');
        String stem = dot > 0 ? name.substring(0, dot) : name;
        String extension = dot > 0 ? name.substring(dot) : "";
        for (int index = 2; index < 10_000; index++) {
            candidate = new File(directory, stem + " (" + index + ")" + extension);
            if (!candidate.exists()) return candidate;
        }
        throw new IllegalStateException("Unable to choose export filename");
    }

    private static String sanitizeFileName(String value) {
        String safe = value == null ? "CYB-Math-export" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (safe.isEmpty()) safe = "CYB-Math-export";
        if (safe.length() > 180) safe = safe.substring(0, 180);
        return safe;
    }
}
