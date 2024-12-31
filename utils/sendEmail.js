const nodemailer = require("nodemailer");
const fs = require('fs');
const {incrementCounter, emailCount} = require('./counter');
const dotenv = require("dotenv");
dotenv.config();

function isEmpty(val){
  return (val === undefined || val == null || val.length <= 0) ? true : false;
}

const sendEmail = async (emaildata) => {
  console.log("sendNewEmailPlain here emaildata", emaildata);
  let gmailtransporter = false
  let gmailtransportererr = false
  const { email, subject, html, filename, filepath } = emaildata;
  try {
    console.log("sendemail23 email, subject, html, filename, filepath", email, subject, html, filename, filepath);

    emailCount().then(async (emailcount) => {
      let transporter;
        if (emailcount < 1900) {
          gmailtransporter = true;
          transporter = nodemailer.createTransport({
            host: process.env.GMAIL_HOST,
            port: process.env.GMAIL_PORT * 1,
            secure: false,//Boolean(process.env.SECURE), //use SSL
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            }
          });
        } else {
          gmailtransporter = false;
          //Node MAILER
          transporter = nodemailer.createTransport({
              host: "smtp.eu.mailgun.org",
              port: 587,
              auth: {
                user: process.env.USER,
                pass: process.env.PASS,
              },
              tls: { rejectUnauthorized: false },
              // logger: true,
              //debug: true 
          });
        }
        
        console.log("Sending mail to %s", email);
        let mailOptions
        if (isEmpty(filename)) {
            mailOptions = {
              from: process.env.NOREPLY_SENDER,
              to: email,
              subject: subject,
              html: html
            };
        } else {
          mailOptions = {
            from: process.env.NOREPLY_SENDER,
            to: email,
            subject: subject,
            html: html,
            attachments: [
               {
                  filename: filename,
                  path: filepath
               }
            ]
          };
        }

        let info = await transporter.sendMail(mailOptions);
        //console.log("info sendMail::", info)
    
        console.log("Email sent Succesfully");
        await incrementCounter();

    }).catch(async (error) => {
        console.log("Email send failure 1")
        console.log(error)
        if (gmailtransporter) {
          gmailtransportererr = true
        }
    });

    //
    // if gmail transporter failed for some reason (Error: Invalid login: 454-4.7.0 Too many login attempts, please try again later. For more information,)
    // try mailgun transport
    //
    if (gmailtransportererr) {
      console.log("gmail failed, trying mailgun")
      //Node MAILER
      let transporter_new = nodemailer.createTransport({
              host: "smtp.eu.mailgun.org",
              port: 587,
              auth: {
                user: process.env.USER,
                pass: process.env.PASS,
              },
              tls: { rejectUnauthorized: false },
              // logger: true,
              //debug: true 
          });
        console.log("2 Sending mail to %s", email);

        let mailOptions2

        if (isEmpty(filename)) {
          mailOptions2 = {
            from: process.env.NOREPLY_SENDER,
            to: email,
            subject: subject,
            html: html
          };
        } else {
          mailOptions2 = {
            from: process.env.NOREPLY_SENDER,
            to: email,
            subject: subject,
            html: html,
            attachments: [
              {
                 filename: filename,
                 path: filepath
              }
            ]
          };
        }

        let info2 = await transporter_new.sendMail(mailOptions2);
        //console.log("info sendMail 2::", info2)
    
        console.log("Email sent Succesfully2");
        await incrementCounter();
    }
  } catch (error) {
      //console.log("Email send failure 2")
      console.log(error)
      //throw new Error('Email send failure!');
  }
};

module.exports = {sendEmail}
