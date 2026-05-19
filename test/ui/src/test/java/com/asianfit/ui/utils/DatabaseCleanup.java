package com.asianfit.ui.utils;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public final class DatabaseCleanup {
  private DatabaseCleanup() {}

  public static void deleteSignupUser() {
    deleteUserByEmail(TestConfig.signupUserEmail());
  }

  public static void deleteTestUserCart() {
    deleteCartByUserEmail(TestConfig.testUserEmail());
  }

  public static void deleteUserByEmail(String email) {
    try (
      Connection connection = DriverManager.getConnection(
        TestConfig.databaseUrl(),
        TestConfig.databaseUser(),
        TestConfig.databasePassword()
      );
      PreparedStatement statement = connection.prepareStatement("DELETE FROM users WHERE email = ?")
    ) {
      statement.setString(1, email == null ? null : email.trim().toLowerCase());
      statement.executeUpdate();
    } catch (SQLException e) {
      throw new IllegalStateException("Failed to delete test user from database", e);
    }
  }

  public static void deletePaymentUserDataByEmail(String email) {
    String normalizedEmail = normalizeEmail(email);
    if (normalizedEmail == null) {
      return;
    }

    try (Connection connection = DriverManager.getConnection(
      TestConfig.databaseUrl(),
      TestConfig.databaseUser(),
      TestConfig.databasePassword()
    )) {
      connection.setAutoCommit(false);
      try {
        Long userId = findUserId(connection, normalizedEmail);
        if (userId == null) {
          connection.commit();
          return;
        }

        List<Long> addressIds = findLongIds(
          connection,
          "SELECT address_id FROM user_addresses WHERE user_id = ?",
          userId
        );
        List<Long> measurementIds = findLongIds(
          connection,
          "SELECT measurement_id FROM user_measurement WHERE user_id = ?",
          userId
        );

        deleteRows(connection,
          """
            DELETE FROM stripe_webhook_events
            WHERE order_id IN (
              SELECT id FROM orders WHERE user_id = ?
            )
              OR stripe_checkout_session_id IN (
                SELECT stripe_session_id FROM stripe_checkout_sessions WHERE user_id = ?
              )
              OR stripe_payment_intent_id IN (
                SELECT stripe_payment_intent_id
                FROM payments
                WHERE order_id IN (
                  SELECT id FROM orders WHERE user_id = ?
                )
                  OR stripe_checkout_session_id IN (
                    SELECT stripe_session_id FROM stripe_checkout_sessions WHERE user_id = ?
                  )
              )
          """,
          userId,
          userId,
          userId,
          userId
        );
        deleteRows(connection,
          """
            DELETE FROM payments
            WHERE order_id IN (
              SELECT id FROM orders WHERE user_id = ?
            )
              OR stripe_checkout_session_id IN (
                SELECT stripe_session_id FROM stripe_checkout_sessions WHERE user_id = ?
              )
          """,
          userId,
          userId
        );
        deleteRows(connection, "DELETE FROM stripe_checkout_sessions WHERE user_id = ?", userId);
        deleteRows(connection, "DELETE FROM carts WHERE user_id = ?", userId);
        deleteRows(connection, "DELETE FROM user_measurement WHERE user_id = ?", userId);
        deleteRows(connection, "DELETE FROM user_addresses WHERE user_id = ?", userId);
        deleteRows(connection, "DELETE FROM orders WHERE user_id = ?", userId);
        deleteRows(connection, "DELETE FROM users WHERE id = ?", userId);

        deleteUnreferencedMeasurements(connection, measurementIds);
        deleteUnreferencedAddresses(connection, addressIds);

        connection.commit();
      } catch (SQLException e) {
        connection.rollback();
        throw e;
      } finally {
        connection.setAutoCommit(true);
      }
    } catch (SQLException e) {
      throw new IllegalStateException("Failed to delete payment test user data from database", e);
    }
  }

  public static void deleteCartByUserEmail(String email) {
    try (
      Connection connection = DriverManager.getConnection(
        TestConfig.databaseUrl(),
        TestConfig.databaseUser(),
        TestConfig.databasePassword()
      );
      PreparedStatement statement = connection.prepareStatement(
        """
          DELETE FROM carts
          WHERE user_id = (
            SELECT id
            FROM users
            WHERE email = ?
          )
        """
      )
    ) {
      statement.setString(1, email == null ? null : email.trim().toLowerCase());
      statement.executeUpdate();
    } catch (SQLException e) {
      throw new IllegalStateException("Failed to delete test user cart from database", e);
    }
  }

  private static String normalizeEmail(String email) {
    if (email == null || email.isBlank()) {
      return null;
    }
    return email.trim().toLowerCase();
  }

  private static Long findUserId(Connection connection, String email) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(
      "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1"
    )) {
      statement.setString(1, email);
      try (ResultSet resultSet = statement.executeQuery()) {
        if (!resultSet.next()) {
          return null;
        }
        return resultSet.getLong(1);
      }
    }
  }

  private static List<Long> findLongIds(Connection connection, String sql, long id) throws SQLException {
    List<Long> ids = new ArrayList<>();
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setLong(1, id);
      try (ResultSet resultSet = statement.executeQuery()) {
        while (resultSet.next()) {
          ids.add(resultSet.getLong(1));
        }
      }
    }
    return ids;
  }

  private static void deleteRows(Connection connection, String sql, long... ids) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      for (int index = 0; index < ids.length; index++) {
        statement.setLong(index + 1, ids[index]);
      }
      statement.executeUpdate();
    }
  }

  private static void deleteUnreferencedMeasurements(Connection connection, List<Long> measurementIds) throws SQLException {
    for (Long measurementId : measurementIds) {
      deleteRows(connection,
        """
          DELETE FROM measurements
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1 FROM user_measurement WHERE measurement_id = ?
            )
        """,
        measurementId,
        measurementId
      );
    }
  }

  private static void deleteUnreferencedAddresses(Connection connection, List<Long> addressIds) throws SQLException {
    for (Long addressId : addressIds) {
      deleteRows(connection,
        """
          DELETE FROM addresses
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1 FROM user_addresses WHERE address_id = ?
            )
            AND NOT EXISTS (
              SELECT 1
              FROM carts
              WHERE shipping_address_id = ?
                 OR billing_address_id = ?
            )
            AND NOT EXISTS (
              SELECT 1
              FROM orders
              WHERE shipping_address_id = ?
                 OR billing_address_id = ?
            )
        """,
        addressId,
        addressId,
        addressId,
        addressId,
        addressId,
        addressId
      );
    }
  }
}
