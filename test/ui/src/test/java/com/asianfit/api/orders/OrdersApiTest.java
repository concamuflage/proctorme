package com.asianfit.api.orders;

import com.asianfit.ui.utils.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.http.Cookies;
import io.restassured.response.Response;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.testng.Assert;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

public class OrdersApiTest {
  private Cookies authCookies;
  private OrderFixture fixture;

  @BeforeClass
  public void setUp() throws SQLException {
    RestAssured.baseURI = TestConfig.baseUrl();
    fixture = insertOrderFixture();
    authenticate();
  }

  @AfterClass(alwaysRun = true)
  public void tearDown() throws SQLException {
    if (fixture == null) {
      return;
    }

    try (
      Connection connection = DriverManager.getConnection(
        TestConfig.databaseUrl(),
        TestConfig.databaseUser(),
        TestConfig.databasePassword()
      );
      PreparedStatement deleteOrder = connection.prepareStatement("DELETE FROM orders WHERE id = ?")
    ) {
      deleteOrder.setLong(1, fixture.orderId());
      deleteOrder.executeUpdate();
    }
  }

  @Test
  public void userCanRetrieveAllOrdersAndThenRetrieveASingleOrder() {
    Response allOrdersResponse = RestAssured
      .given()
      .cookies(authCookies)
      .accept(ContentType.JSON)
      .get("/api/profile/orders");

    allOrdersResponse.then().statusCode(200);

    List<Map<String, Object>> orders = allOrdersResponse.jsonPath().getList("$");
    Assert.assertNotNull(orders, "Orders payload should be a list");

    Map<String, Object> insertedOrder = orders
      .stream()
      .filter((order) -> fixture.invoiceNumber().equals(order.get("invoiceNumber")))
      .findFirst()
      .orElseThrow(() -> new AssertionError("Expected the inserted order to be returned by /api/profile/orders"));

    long retrievedOrderId = ((Number) insertedOrder.get("id")).longValue();
    Assert.assertEquals(retrievedOrderId, fixture.orderId());
    Assert.assertEquals(insertedOrder.get("paymentStatus"), "paid");
    Assert.assertEquals(insertedOrder.get("shipmentStatus"), "unshipped");

    Response singleOrderResponse = RestAssured
      .given()
      .cookies(authCookies)
      .accept(ContentType.JSON)
      .get("/api/profile/orders/" + retrievedOrderId);

    singleOrderResponse.then().statusCode(200);

    Assert.assertEquals(singleOrderResponse.jsonPath().getLong("id"), fixture.orderId());
    Assert.assertEquals(singleOrderResponse.jsonPath().getString("invoiceNumber"), fixture.invoiceNumber());
    Assert.assertEquals(singleOrderResponse.jsonPath().getString("paymentStatus"), "paid");
    Assert.assertEquals(singleOrderResponse.jsonPath().getString("shipmentStatus"), "unshipped");
    Assert.assertEquals(singleOrderResponse.jsonPath().getString("shipping.mode"), fixture.shippingMode());
    Assert.assertEquals(singleOrderResponse.jsonPath().getInt("items.size()"), 1);
    Assert.assertEquals(singleOrderResponse.jsonPath().getInt("items[0].variantId"), fixture.variantId());
    Assert.assertEquals(singleOrderResponse.jsonPath().getInt("items[0].quantity"), fixture.quantity());
  }

  private void authenticate() {
    Response csrfResponse = RestAssured
      .given()
      .redirects()
      .follow(false)
      .accept(ContentType.JSON)
      .get("/api/auth/csrf");

    csrfResponse.then().statusCode(200);

    String csrfToken = csrfResponse.jsonPath().getString("csrfToken");
    Assert.assertTrue(csrfToken != null && !csrfToken.isBlank(), "Expected a CSRF token from NextAuth");
    authCookies = csrfResponse.getDetailedCookies();

    Response loginResponse = RestAssured
      .given()
      .cookies(authCookies)
      .contentType("application/x-www-form-urlencoded; charset=UTF-8")
      .accept(ContentType.JSON)
      .formParam("csrfToken", csrfToken)
      .formParam("email", TestConfig.testUserEmail())
      .formParam("password", TestConfig.testUserPassword())
      .formParam("callbackUrl", TestConfig.baseUrl() + "/products")
      .formParam("json", "true")
      .post("/api/auth/callback/credentials");

    int loginStatus = loginResponse.statusCode();
    Assert.assertTrue(
      loginStatus == 200 || loginStatus == 302,
      "Expected NextAuth login to succeed, but got status " + loginStatus
    );
    authCookies = loginResponse.getDetailedCookies();

    Response sessionResponse = RestAssured
      .given()
      .cookies(authCookies)
      .accept(ContentType.JSON)
      .get("/api/auth/session");

    sessionResponse.then().statusCode(200);
    Assert.assertEquals(sessionResponse.jsonPath().getString("user.email"), TestConfig.testUserEmail());
  }

  private OrderFixture insertOrderFixture() throws SQLException {
    try (
      Connection connection = DriverManager.getConnection(
        TestConfig.databaseUrl(),
        TestConfig.databaseUser(),
        TestConfig.databasePassword()
      )
    ) {
      long userId = getRequiredLong(
        connection,
        "SELECT id FROM users WHERE lower(email) = lower(?) LIMIT 1",
        TestConfig.testUserEmail()
      );
      int shippingAddressId = getRequiredInt(
        connection,
        """
          SELECT address_id
          FROM user_addresses
          WHERE user_id = ?
            AND address_type = 'shipping'
          ORDER BY is_default DESC, address_id ASC
          LIMIT 1
        """,
        userId
      );
      Integer billingAddressId = getOptionalInt(
        connection,
        """
          SELECT address_id
          FROM user_addresses
          WHERE user_id = ?
            AND address_type = 'billing'
          ORDER BY is_default DESC, address_id ASC
          LIMIT 1
        """,
        userId
      );
      int chosenBillingAddressId = billingAddressId != null ? billingAddressId : shippingAddressId;
      ShippingRow shipping = getShippingRow(connection);
      int variantId = getRequiredInt(
        connection,
        "SELECT id FROM product_variants ORDER BY id ASC LIMIT 1"
      );
      String invoiceNumber = "API-TEST-" + System.currentTimeMillis();
      Timestamp now = Timestamp.from(Instant.now());

      long orderId;
      try (
        PreparedStatement insertOrder = connection.prepareStatement(
          """
            INSERT INTO orders (
              user_id,
              shipment_status,
              payment_status,
              payment_provider,
              payment_reference,
              paid_at,
              currency_code,
              subtotal_usd,
              shipping_usd,
              total_usd,
              clothes_weight_kg,
              box_weight_kg,
              shipping_weight_kg,
              shipping_id,
              invoice_number,
              invoice_generated_at,
              created_at,
              updated_at,
              shipping_address_id,
              billing_address_id
            )
            VALUES (?, 'unshipped', 'paid', 'rest-assured', ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          Statement.RETURN_GENERATED_KEYS
        )
      ) {
        insertOrder.setLong(1, userId);
        insertOrder.setString(2, "rest-assured-" + System.currentTimeMillis());
        insertOrder.setTimestamp(3, now);
        insertOrder.setBigDecimal(4, new java.math.BigDecimal("72.00"));
        insertOrder.setBigDecimal(5, new java.math.BigDecimal("20.30"));
        insertOrder.setBigDecimal(6, new java.math.BigDecimal("92.30"));
        insertOrder.setBigDecimal(7, new java.math.BigDecimal("1.15"));
        insertOrder.setBigDecimal(8, new java.math.BigDecimal("0.25"));
        insertOrder.setBigDecimal(9, new java.math.BigDecimal("1.40"));
        insertOrder.setInt(10, shipping.id());
        insertOrder.setString(11, invoiceNumber);
        insertOrder.setTimestamp(12, now);
        insertOrder.setTimestamp(13, now);
        insertOrder.setTimestamp(14, now);
        insertOrder.setInt(15, shippingAddressId);
        insertOrder.setInt(16, chosenBillingAddressId);
        insertOrder.executeUpdate();

        try (ResultSet generatedKeys = insertOrder.getGeneratedKeys()) {
          if (!generatedKeys.next()) {
            throw new IllegalStateException("Expected generated order id");
          }
          orderId = generatedKeys.getLong(1);
        }
      }

      try (
        PreparedStatement insertOrderVariant = connection.prepareStatement(
          """
            INSERT INTO orders_variants (order_id, variant_id, quantity)
            VALUES (?, ?, ?)
          """
        )
      ) {
        insertOrderVariant.setLong(1, orderId);
        insertOrderVariant.setInt(2, variantId);
        insertOrderVariant.setInt(3, 2);
        insertOrderVariant.executeUpdate();
      }

      return new OrderFixture(orderId, invoiceNumber, shipping.mode(), variantId, 2);
    }
  }

  private long getRequiredLong(Connection connection, String sql, Object... params) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      bindParams(statement, params);
      try (ResultSet resultSet = statement.executeQuery()) {
        if (!resultSet.next()) {
          throw new IllegalStateException("Required test data is missing for query: " + sql);
        }
        return resultSet.getLong(1);
      }
    }
  }

  private int getRequiredInt(Connection connection, String sql, Object... params) throws SQLException {
    return Math.toIntExact(getRequiredLong(connection, sql, params));
  }

  private Integer getOptionalInt(Connection connection, String sql, Object... params) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      bindParams(statement, params);
      try (ResultSet resultSet = statement.executeQuery()) {
        if (!resultSet.next()) {
          return null;
        }
        return resultSet.getInt(1);
      }
    }
  }

  private ShippingRow getShippingRow(Connection connection) throws SQLException {
    try (
      PreparedStatement statement = connection.prepareStatement(
        """
          SELECT id, mode
          FROM shipping_cost
          ORDER BY id ASC
          LIMIT 1
        """
      );
      ResultSet resultSet = statement.executeQuery()
    ) {
      if (!resultSet.next()) {
        throw new IllegalStateException("No shipping_cost rows exist for the API test fixture");
      }
      return new ShippingRow(resultSet.getInt("id"), resultSet.getString("mode"));
    }
  }

  private void bindParams(PreparedStatement statement, Object... params) throws SQLException {
    for (int index = 0; index < params.length; index++) {
      statement.setObject(index + 1, params[index]);
    }
  }

  private record ShippingRow(int id, String mode) {}

  private record OrderFixture(long orderId, String invoiceNumber, String shippingMode, int variantId, int quantity) {}
}
