package cn.cybmath.app;

import android.os.Bundle;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private NativeShell shell;
    NativeShell nativeShell() { return shell; }
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(FileSaverPlugin.class);
        registerPlugin(AppHostPlugin.class);
        super.onCreate(savedInstanceState);
        shell = new NativeShell(this);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                shell.back();
            }
        });
    }
    @Override public void onPause() {
        super.onPause();
        if (getBridge() != null) {
            if (shell != null) shell.persist(() -> { getBridge().getWebView().onPause(); getBridge().getWebView().pauseTimers(); });
            else { getBridge().getWebView().onPause(); getBridge().getWebView().pauseTimers(); }
        }
    }
    @Override public void onResume() { super.onResume(); if (getBridge() != null) { getBridge().getWebView().onResume(); getBridge().getWebView().resumeTimers(); } }
    @Override public void onDestroy() { if (shell != null) shell.destroy(); super.onDestroy(); }
}
