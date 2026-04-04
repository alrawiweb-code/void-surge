package com.voidsurge.game;

import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeBridge")
public class NativeBridgePlugin extends Plugin {
    @PluginMethod
    public void openPrivacyPolicy(PluginCall call) {
        Intent intent = new Intent(getContext(), PrivacyPolicyActivity.class);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openAboutUs(PluginCall call) {
        Intent intent = new Intent(getContext(), AboutUsActivity.class);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getHighScore(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("VoidSurgePrefs", android.content.Context.MODE_PRIVATE);
        int highScore = prefs.getInt("high_score", 0);
        
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("highScore", highScore);
        call.resolve(ret);
    }

    @PluginMethod
    public void saveHighScore(PluginCall call) {
        int score = call.getInt("score", 0);
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("VoidSurgePrefs", android.content.Context.MODE_PRIVATE);
        int currentHighScore = prefs.getInt("high_score", 0);
        
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        if (score > currentHighScore) {
            prefs.edit().putInt("high_score", score).apply();
            ret.put("isNewHighScore", true);
        } else {
            ret.put("isNewHighScore", false);
        }
        ret.put("highScore", Math.max(score, currentHighScore));
        call.resolve(ret);
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        if (getActivity() != null) {
            getActivity().finishAffinity();
        }
        call.resolve();
    }
}
