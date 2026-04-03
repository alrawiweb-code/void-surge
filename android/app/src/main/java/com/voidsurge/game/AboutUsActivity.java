package com.voidsurge.game;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AboutUsActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.parseColor("#000000")); // Match app style
        layout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT));
        layout.setPadding(60, 60, 60, 40);

        LinearLayout contentLayout = new LinearLayout(this);
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        contentLayout.setGravity(Gravity.CENTER);
        contentLayout.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f));

        TextView title = new TextView(this);
        title.setText("About Us");
        title.setTextColor(Color.parseColor("#00f2ff")); // Neon cyan theme color
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 36);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, 40);
        title.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView developerLabel = new TextView(this);
        developerLabel.setText("This app is developed by Alrawiweb.");
        developerLabel.setTextColor(Color.parseColor("#ffcc00"));
        developerLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        developerLabel.setGravity(Gravity.CENTER);
        developerLabel.setPadding(0, 0, 0, 20);
        developerLabel.setTypeface(null, android.graphics.Typeface.BOLD);

        TextView body = new TextView(this);
        body.setText("We focus on building simple, intuitive, and reliable digital experiences that deliver real value to users.");
        body.setTextColor(Color.parseColor("#ffffff"));
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        body.setGravity(Gravity.CENTER);
        body.setLineSpacing(0, 1.3f);

        contentLayout.addView(title);
        contentLayout.addView(developerLabel);
        contentLayout.addView(body);

        String versionName = "1.0.0";
        try {
            android.content.pm.PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            versionName = pInfo.versionName;
        } catch (android.content.pm.PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }

        TextView version = new TextView(this);
        version.setText("Version " + versionName);
        version.setTextColor(Color.parseColor("#777777"));
        version.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        version.setGravity(Gravity.CENTER);
        version.setPadding(0, 20, 0, 0);

        layout.addView(contentLayout);
        layout.addView(version);

        setContentView(layout);
    }
}
