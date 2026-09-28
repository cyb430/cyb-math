package cn.cybmath.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileSaver")
public class FileSaverPlugin extends Plugin {
    private static final int MAX_EXPORT_BYTES = 50 * 1024 * 1024;

    @PluginMethod
    public void save(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.length() > ((MAX_EXPORT_BYTES + 2L) / 3L) * 4L) {
            call.reject("Missing export data or export exceeds 50 MB limit");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        String mimeType = call.getString("mimeType", "application/octet-stream").split(";", 2)[0].trim();
        intent.setType(mimeType.contains("/") ? mimeType : "application/octet-stream");
        intent.putExtra(Intent.EXTRA_TITLE, sanitizeFileName(call.getString("fileName", "CYB-Math-export")));
        try {
            startActivityForResult(call, intent, "documentCreated");
        } catch (Exception error) {
            call.reject("Unable to open save dialog", error);
        }
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            JSObject response = new JSObject();
            response.put("canceled", true);
            call.resolve(response);
            return;
        }
        Uri uri = data.getData();
        execute(() -> {
            try {
                byte[] bytes = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
                if (bytes.length > MAX_EXPORT_BYTES) throw new IllegalArgumentException("Export exceeds 50 MB limit");
                try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "w")) {
                    if (stream == null) throw new IllegalStateException("Unable to open selected file");
                    stream.write(bytes);
                }
                JSObject response = new JSObject();
                response.put("path", uri.toString());
                response.put("canceled", false);
                call.resolve(response);
            } catch (Exception error) {
                call.reject("Unable to save export", error);
            }
        });
    }

    private static String sanitizeFileName(String value) {
        String safe = value == null ? "CYB-Math-export" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (safe.isEmpty()) safe = "CYB-Math-export";
        if (safe.length() > 180) safe = safe.substring(0, 180);
        return safe;
    }
}
