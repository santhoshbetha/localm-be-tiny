const express = require("express");
const db = require('../db');
const winston = require("winston");
const { sendEmail } = require("../utils/sendEmail")
const recovery = express.Router();

recovery.post("/sendrecoveryemail", async (req, res) => {
  console.log("sendrecoveryemail::", req.body)
  const { otp, email } = req.body;
  console.log(otp, email)
  try {
      /*await sendEmail(
        email, 
        "MarryLocal Code", 
        `<p>Hello, Your MarryLocal Code is ${otp}</p>`,
      );*/
      await sendEmail({
        email: email, 
        subject: "MarryLocal Code", 
        html: `<p>Hello, Your MarryLocal Code is ${otp}</p>
              <br/>
              Thank You,
              <br>
              MarryLocal
              `
      });

      return res.status(200).json({
          message: "success"
      })
  } catch (error) {
    console.log("send email error", error)
    return res.status(500).json({
      message: "failed"
    }); 
  }
});

module.exports = recovery;
  
