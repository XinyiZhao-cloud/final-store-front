/**
 * CST8915 Final Project - Store Front Service
 *
 * Author: Xinyi Zhao
 * Course: CST8915 Full-stack Cloud-native Development
 * Semester: Winter 2026
 *
 * Description:
 * This service provides the customer-facing web interface.
 * It allows users to browse products, add items to cart, and checkout.
 *
 * Architecture Role:
 * - Frontend service deployed in Kubernetes
 * - Communicates with Product Service and Order Service via HTTP
 * - Manages user session and cart state
 *
 * Features:
 * - Display product catalog
 * - Add/remove items from cart
 * - Checkout and create orders
 * - Session-based cart management
 *
 * Note:
 * - Uses EJS for server-side rendering
 * - Static assets (images) served from public folder
 * - Entry point for end users
 */
const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

// ==============================
// View Engine Setup
// ==============================
// Uses EJS templates to render dynamic HTML pages
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ==============================
// Middleware
// ==============================
// Parse form data, parse JSON, and serve static assets
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// Session Configuration
// ==============================
// Stores cart data per user sessio
app.use(
    session({
        secret: "bestbuy-demo-secret",
        resave: false,
        saveUninitialized: true,
    })
);

// ==============================
// Configuration
// ==============================
const PORT = process.env.PORT || 3000;

// Internal service endpoints (Kubernetes services)
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3002";

// ==============================
// Helper Functions
// ==============================
// Ensure the current session always has a cart array
function initializeCart(req) {
    if (!req.session.cart) {
        req.session.cart = [];
    }
}

// Count total quantity of items in cart
function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

// Calculate total price of all items in cart
function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ==============================
// Home Page
// ==============================
// Fetch products from Product Service and render storefront
app.get("/", async (req, res) => {
    initializeCart(req);

    try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
        res.render("index", {
            products: response.data,
            cartCount: getCartCount(req.session.cart),
        });
    } catch (error) {
        res.status(500).send("Error loading products");
    }
});

// ==============================
// Add Item to Cart
// ==============================
// Finds the selected product from Product Service and stores
// it in session cart. Supports MongoDB _id or legacy id values.
app.post("/cart/add", async (req, res) => {
    initializeCart(req);

    const productId = req.body.productId;

    try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
        const products = response.data;

        const product = products.find(
            (p) => String(p._id || p.id) === String(productId)
        );

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const existingItem = req.session.cart.find(
            (item) => String(item.id) === String(productId)
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            req.session.cart.push({
                id: product._id || product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1,
            });
        }

        res.redirect("/");
    } catch (error) {
        res.status(500).send("Failed to add item to cart");
    }
});

// ==============================
// View Cart
// ==============================
// Renders the cart page with session-based cart data
app.get("/cart", (req, res) => {
    initializeCart(req);

    res.render("cart", {
        cart: req.session.cart,
        cartCount: getCartCount(req.session.cart),
        cartTotal: getCartTotal(req.session.cart),
    });
});

// ==============================
// Remove Item from Cart
// ==============================
// Removes a selected item from the session cart
app.post("/cart/remove", (req, res) => {
    initializeCart(req);

    const productId = req.body.productId;
    req.session.cart = req.session.cart.filter(
        (item) => String(item.id) !== String(productId)
    );

    res.redirect("/cart");
});

// ==============================
// Checkout
// ==============================
// Sends order data to Order Service, then clears the cart
// and renders an order confirmation page
app.post("/checkout", async (req, res) => {
    initializeCart(req);

    if (req.session.cart.length === 0) {
        return res.redirect("/cart");
    }

    try {
        const orderPayload = {
            customerName: "Cindy",
            items: req.session.cart.map((item) => ({
                productId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
            })),
        };

        const response = await axios.post(`${ORDER_SERVICE_URL}/orders`, orderPayload);
        const order = response.data;

        const orderedItems = [...req.session.cart];
        const total = getCartTotal(orderedItems);

        // Clear cart after successful checkout
        req.session.cart = [];

        res.render("success", {
            order,
            orderedItems,
            total,
            cartCount: 0,
        });
    } catch (error) {
        res.status(500).send("Checkout failed");
    }
});

// ==============================
// Start Server
// ==============================
app.listen(PORT, () => {
    console.log(`Store Front running on port ${PORT}`);
});