const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv")
const cors = require("cors");

const app = express();

dotenv.config()

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use(
    cors({
        origin: function (origin, callback) {
            callback(null, true);
        },
        credentials: true,
    })
);

const user = require("./routes/user");
const post = require("./routes/post");

app.use("/api", user);
app.use("/api", post);

module.exports = app;
