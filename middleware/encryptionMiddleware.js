//https://codingkakida.com/node-js-api-with-encryption-and-sending-dynamic-iv-to-client/

const crypto = require('crypto');
var url = require("url");
var CryptoJS = require("crypto-js");
var dotenv = require('dotenv');
dotenv.config()

function encrypt(plaintext, iv) {
    var key = CryptoJS.enc.Utf8.parse(process.env.CRYPTO_SECRET);

    // Encrypt the plaintext
    var cipherText = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
      });
    return cipherText.toString();
}

function decrypt(text, iv) {
    // IV is a base64 string
    let iv1 = CryptoJS.enc.Base64.parse(iv);
    
    var key = CryptoJS.enc.Utf8.parse(process.env.CRYPTO_SECRET);
    var cipherBytes = CryptoJS.enc.Base64.parse(text);

    var decrypted = CryptoJS.AES.decrypt({ciphertext: cipherBytes}, key, {
        iv: iv1,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
}

//Encryption Middleware
function encryptionMiddleware (req, res, next) {
    //console.log("encryptionMiddleware::")

    //console.log("req.url::", req.url)
    var pathname = url.parse(req.url, true).pathname; 
    //console.log("pathname:;", pathname)

    const pathArray = pathname.split('/')
    //console.log("pathArray::", pathArray)

    const includessearch = pathArray.includes('search')
    //console.log("includes search::", includessearch)
    
    const originalSend = res.send;

    if (includessearch) {
        //
        // encrypts data before sending to front end
        //
        res.send = function (data) {
            var iv = CryptoJS.lib.WordArray.random(16);
            const encryptedData = encrypt(JSON.stringify(data), iv);
            res.setHeader('IV', CryptoJS.enc.Base64.stringify(iv));
            originalSend.call(this, encryptedData);
        };
        //
        // decrypts received data from front end
        //
        if (req.body && req.body.encryptedData) {
            const iv = Buffer.from(req.headers.iv, 'hex');
            const decryptedData = decrypt(req.body.encryptedData, iv);
            req.body = JSON.parse(decryptedData);
        }
    }
    next();
};

module.exports = encryptionMiddleware;