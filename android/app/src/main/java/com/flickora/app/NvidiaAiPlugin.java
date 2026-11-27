package com.flickora.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Native HTTP bridge for NVIDIA NIM. The API does not send CORS headers for a
 * WebView origin, so the request is performed off-thread in Java and the JSON
 * body is handed back to JavaScript unchanged.
 */
@CapacitorPlugin(name = "NvidiaAi")
public class NvidiaAiPlugin extends Plugin {
    private static final String API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
    private static final int MAX_RESPONSE = 65536;

    @PluginMethod
    public void chat(PluginCall call) {
        String apiKey = call.getString("apiKey");
        String payload = call.getString("payload");
        if (apiKey == null || apiKey.isEmpty() || payload == null || payload.isEmpty()) {
            call.reject("Missing API key or payload");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(API_URL).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("Authorization", "Bearer " + apiKey);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "application/json");
                connection.setDoOutput(true);
                byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(bytes);
                }

                int status = connection.getResponseCode();
                InputStream stream = status >= 200 && status < 300
                        ? connection.getInputStream()
                        : connection.getErrorStream();
                StringBuilder body = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null && body.length() < MAX_RESPONSE) {
                            body.append(line);
                        }
                    }
                }

                JSObject result = new JSObject();
                result.put("status", status);
                result.put("body", body.toString());
                getActivity().runOnUiThread(() -> call.resolve(result));
            } catch (Exception error) {
                String message = error.getMessage() == null ? error.toString() : error.getMessage();
                getActivity().runOnUiThread(() -> call.reject(message));
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "flickora-nvidia-ai").start();
    }
}
