const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: "bestbuy-demo-secret",
        resave: false,
        saveUninitialized: true,
    })
);

const PORT = process.env.PORT || 3000;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:3002";

function initializeCart(req) {
    if (!req.session.cart) {
        req.session.cart = [];
    }
}

function getCartCount(cart) {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

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

app.post("/cart/add", async (req, res) => {
    initializeCart(req);

    const productId = Number(req.body.productId);

    try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
        const products = response.data;
        const product = products.find((p) => Number(p.id) === productId);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const existingItem = req.session.cart.find((item) => Number(item.id) === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            req.session.cart.push({
                id: product.id,
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

app.get("/cart", (req, res) => {
    initializeCart(req);

    res.render("cart", {
        cart: req.session.cart,
        cartCount: getCartCount(req.session.cart),
        cartTotal: getCartTotal(req.session.cart),
    });
});

app.post("/cart/remove", (req, res) => {
    initializeCart(req);

    const productId = Number(req.body.productId);
    req.session.cart = req.session.cart.filter((item) => Number(item.id) !== productId);

    res.redirect("/cart");
});

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

app.listen(PORT, () => {
    console.log(`Store Front running on port ${PORT}`);
});