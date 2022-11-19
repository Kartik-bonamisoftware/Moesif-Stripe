const jwt = require("jsonwebtoken");
const axios = require("axios");

const moesifStripeFunc = async (req, res, next) => {
  const userToken = req.headers["authorization"];
  userToken.trim();
  const token = userToken.replace("Bearer ", "");
  const userPricingId = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const moesifUserPriceId = userPricingId.id;
  //   if (moesifUserPriceId === "SECRET123") {
  const moesifUserDataResponse = await axios.post(
    "https://api.moesif.com/search/~/count/events?from=-1M&to=now",
    {
      post_filter: {
        bool: {
          should: {
            term: {
              "user_id.raw": moesifUserPriceId,
            },
          },
        },
      },
    },
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.MOESIF_MANAGEMENT_KEY}`,
      },
    }
  );
  const hitCount = moesifUserDataResponse.data.hits.total;
  console.log("hitCount", hitCount);
  if (hitCount > process.env.API_COUNT) {
    res.send({
      status: "error",
      message: `50 Limit reached. Now, you have to buy our premium plan.`,
      link: `https://www.moesif.com/price`,
    });
  } else {
    next();
    // res.send(`Your current hitcount ${hitCount}`);
  }
  // if (hitCount > 20) {
  //   return false;
  // } else if (hitCount < 20) {
  //   return true;
  // } else {
  //   return false;
  // }
  //   }
  //   else if (moesifUserPriceId === process.env.STRIPE_PRICE_KEY_PREMIUM_USERS) {
  //     return true;
  //   } else {
  //     return false;
  //   }
};

module.exports = moesifStripeFunc;
