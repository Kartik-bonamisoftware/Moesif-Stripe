require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const moesif = require("moesif-nodejs");
const Stripe = require("stripe");
// npm install express-jwt@5.3.1
const { expressjwt: ejwt } = require("express-jwt");
// npm install jsonwebtoken
const jwt = require("jsonwebtoken");
const moesifStripeFunc = require("./moesifStripeFunc");
const app = express();
app.use(express.static(path.join(__dirname)));
const port = 3000;
const stripe = Stripe(process.env.STRIPE_KEY);
var jsonParser = bodyParser.json();

const moesifMiddleware = moesif({
  applicationId: process.env.MOESIF_APPLICATION_ID,
  identifyUser: function (req, _res) {
    return req.auth.id;
  },
  identifyCompany: function (req, res) {
    // your code here, must return a string. The code below is an example.
    return req.headers;
  },
});
app.use(moesifMiddleware);
const generateAccessToken = async (id) => {
  const token = await jwt.sign(id, process.env.JWT_SECRET_KEY);
  return token;
};
app.post("/register", jsonParser, async (req, res) => {
  // create Stripe customer
  const customer = await stripe.customers.create({
    email: req.body.email,
    name: `${req.body.firstname} ${req.body.lastname}`,
    description: "Customer created through /register endpoint",
  });
  // create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.PRICE_KEY }],
  });
  // create user and company in Moesif
  var company = { companyId: subscription.id };
  moesifMiddleware.updateCompany(company);
  var user = {
    userId: customer.id,
    // companyId: subscription.id,
    metadata: {
      email: req.body.email,
      firstName: req.body.firstname,
      lastName: req.body.lastname,
    },
  };
  moesifMiddleware.updateUser(user);
  // generate new jwt for user
  const token = await generateAccessToken({ id: customer.id });
  console.log(user);
  console.log(company);
  // [optional] update user profile with jwt
  var user = {
    userId: customer.id,
    metadata: {
      jwt: token,
    },
  };
  moesifMiddleware.updateUser(user);
  res.status(200);
  res.send({ jwt: token });
});
app.get(
  "/test-service/",
  ejwt({
    secret: process.env.JWT_SECRET_KEY,
    algorithms: ["HS256"],
  }),
  (_req, res) => {
    res.status(200);
    res.send("this is a response");
  }
);

app.get("/", function (_req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
  res.sendFile(path.join(__dirname, "index.js"));
});

app.get(
  "/sample-api",
  ejwt({ secret: process.env.JWT_SECRET_KEY, algorithms: ["HS256"] }),
  moesifStripeFunc,
  (req, res) => {
    res.send("Data send................!!!!");
  }
);

const stripeUpdate = require("stripe")(process.env.STRIPE_KEY);

app.post("/subscription-update", async (req, res) => {
  // const userToken = req.headers["authorization"];
  // userToken.trim();
  // const token = userToken.replace("Bearer ", "");
  // const userPricingId = jwt.verify(token, process.env.JWT_SECRET_KEY);
  // // console.log("userPricingId ------------> ", userPricingId.id);

  // const subscription = await stripeUpdate.subscriptions.update(
  //   "sub_1LuUXySHvFSwotoUTxQqv7m5"
  // );
  // var company = { userId: subscription.id };
  // console.log("subscription----------->", subscription.id);
  // moesifMiddleware.updateUser(company);
  // res.send(subscription);

  const subscription = await stripe.subscriptions.retrieve(
    "sub_1LuUXySHvFSwotoUTxQqv7m5"
  );
  stripe.subscriptions.update("sub_1LuUXySHvFSwotoUTxQqv7m5", {
    cancel_at_period_end: false,
    proration_behavior: "create_prorations",
    items: [
      {
        id: subscription.items.data[0].id,
        price: "price_1LuYDuSHvFSwotoUEd9jEWWP",
      },
    ],
  });
  res.send(subscription);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
