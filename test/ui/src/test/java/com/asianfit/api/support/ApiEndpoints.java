package com.asianfit.api.support;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public final class ApiEndpoints {
  private static final String RESOURCE_NAME = "api-endpoints.yaml";
  private static final Map<String, String> ENDPOINTS = loadEndpoints();

  private ApiEndpoints() {}

  public static String path(String key) {
    String path = ENDPOINTS.get(key);
    if (path == null || path.isBlank()) {
      throw new IllegalArgumentException("Missing API endpoint for key: " + key);
    }
    return path;
  }

  public static String path(String key, Map<String, String> variables) {
    String resolved = path(key);
    for (Map.Entry<String, String> entry : variables.entrySet()) {
      resolved = resolved.replace("{" + entry.getKey() + "}", entry.getValue());
    }
    return resolved;
  }

  private static Map<String, String> loadEndpoints() {
    try (InputStream stream = ApiEndpoints.class.getClassLoader().getResourceAsStream(RESOURCE_NAME)) {
      if (stream == null) {
        throw new IllegalStateException("Missing API endpoints resource: " + RESOURCE_NAME);
      }

      String raw = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      Map<String, String> endpoints = new HashMap<>();
      for (String rawLine : raw.split("\\R")) {
        String line = rawLine.trim();
        if (line.isEmpty() || line.startsWith("#")) {
          continue;
        }

        int separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) {
          continue;
        }

        String key = line.substring(0, separatorIndex).trim();
        String value = line.substring(separatorIndex + 1).trim();
        if (!key.isEmpty() && !value.isEmpty()) {
          endpoints.put(key, value);
        }
      }
      return endpoints;
    } catch (IOException error) {
      throw new IllegalStateException("Unable to load API endpoints.", error);
    }
  }
}
