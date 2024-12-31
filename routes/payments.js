const express = require("express");
//const auth = require('../middleware/auth');
const db = require('../db');
const { sendEmail, emailQueue } = require("../utils/sendEmail");
const { createInvoice, uploadInvoice } = require('../utils/invoiceutils')
const routerPayments = express.Router();
const path = require('path');
const chokidar = require('chokidar');
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');

const dotenv = require("dotenv");
const objectToQueryParams = require('object-to-query-params');

dotenv.config();
function isEmpty(val){
    return (val === undefined || val == null || val.length <= 0) ? true : false;
}

routerPayments.post('/record-payment', /* auth, */ async (req, res) => {
    const { userid, name, city, state, emailid, paymentobj } = req.body;
    //console.log("record-payment here", paymentobj, name, userid, emailid)
    var index = 0
    let referencenumber = paymentobj.referencenumber != null ? paymentobj.referencenumber : 12345
    try {
        const transactiondatetime = new Date(Date.now(paymentobj.transactiondate)).toISOString().replace('T',' ').replace('Z','');
        //console.log("transactiondatetime:", transactiondatetime)
        const transactionresult = await db.query("INSERT INTO transactions (transaction_id, userid, \
                                                   order_id, order_amount, \
                                                   transaction_date, \
                                                   transaction_status, \
                                                   reference_number, \
                                                   useremail) \
                                                   VALUES (nextval('transactions_seq'), $1, $2, $3, $4, $5, $6, $7) RETURNING transaction_id",
                                                   [ 
                                                      userid,
                                                      paymentobj.orderid,
                                                      paymentobj.paymentamount,
                                                      transactiondatetime,
                                                      paymentobj.paymentstatus,
                                                      referencenumber,
                                                      emailid
                                                   ]);

        //
        // INVOICE 
        //
        //console.log("record payment INVOICE")
        let filenameinvoice
        createInvoice(userid, name, city, state, paymentobj.paymentamount, referencenumber).then(async (fileout) => {
            filenameinvoice = path.basename(fileout[0]);
            const filenameext = path.extname(fileout[0]);

            //
            //
            //
            var dir = `${os.tmpdir()}/files/invoices/${userid}`;
              chokidar.watch(dir, {
              persistent: true
            }).on('add', async (event, path) => {
                //console.log(`File ${path} has been added`, path, event)
                index = index + 1
                console.log("index index value", index)
                if (index == 1) {
                    let loc = await uploadInvoice(userid, filenameinvoice, fileout[0], 'pdf');
                }
            
                //
                // Send Email
                //
                /*if (emailid != null && name != null) {
                    console.log("record-payment before sendemail")
                    await sendNewEmail({
                        email: emailid, 
                        subject: "Your Payment to Marrylocal", 
                        html: `<p>Hello <span style="text-transform:capitalize">${name}</span>, We have received your payment, Thank you.</p>
                        <p>Payment Amount:${paymentobj?.paymentamount}.00</p>
                        <p>Reference Number:${paymentobj?.referencenumber}</p>
                        Regards,
                        <br>
                        MarryLocal
                        `,
                        filename: filenameinvoice,
                        filepath: fileout[0]
                    });
                }*/
            });
        })
        return res.status(200).json({
            status: "success"
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json(
            {
                status: "error",
                message: "Error: " + "record-payment"
            }
        );
    }
});

//
// PhonePe
//
// PhonePe Order
routerPayments.post('/phonepe/order', /* auth, */ async (req, res) => {
    const { name, amount, number, MUID, transactionId} = req.body;

    console.log("router payments 1", name, amount, number, MUID, transactionId)
    try {
        const merchantTransactionId = req.body.transactionId;
        const data = {
            merchantId: process.env.MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: req.body.MUID,
            name: req.body.name,
            amount: req.body.amount * 100,  // paise
            redirectUrl: `${process.env.ML_SERVER_URL}/api/v1/payments/phonepe/status/?id=${merchantTransactionId}`,
            redirectMode: 'POST',
            mobileNumber: req.body.number,
            paymentInstrument: {
                type: 'PAY_PAGE' //'UPI_QR'
            }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');
        const keyIndex = 1;
        const string = payloadMain + '/pg/v1/pay' + process.env.SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
        const preprod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

        const options = {
            method: 'POST',
            url: prod_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        };
        
        axios.request(options).then(function (response) {
            //console.log(response.data)
            console.log("resp here")
            return res.status(200).json(
                response.data
            )
        })
        .catch(function (error) {
            console.error(error);
        });

    } catch (error) {
        console.log("router payments error", error)
        return res.status(500).json(
            {
              status: "error",
              message: "Error: " + "CreateOrder"
            }
        );
    }
});

// PhonePe Status  // no 'auth' below because it is called from 'PhonePe' redirect
routerPayments.post('/phonepe/status', /* auth, */ async (req, res) => {
    console.log("router payments status")

    let salt_key = process.env.SALT_KEY
    let merchant_id = process.env.MERCHANT_ID

    const merchantTransactionId = req.query.id
    const merchantId = merchant_id

    const keyIndex = 1;
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + salt_key;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + "###" + keyIndex;

    const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1"
    const preprod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1"

    const options = {
        method: 'GET',
        //url: `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        url: `${prod_URL}/status/${merchantId}/${merchantTransactionId}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': `${merchantId}`
        }
    };

    try {
        console.log("router payments status try..")
        axios.request(options).then(async (response) => {
            //console.log("1 payment response :", response)
            //console.log("1 payment response data::", response.data)
            if (!isEmpty(response.data)) {
                if (response.data.success === true) {
                    if (response.data.data.responseCode == "SUCCESS" && response.data.data.state == "COMPLETED") {
                        //console.log("router payments status success")
                        //console.log(response.data)
                        const url = `${process.env.ML_URL}/paymentstatus`
                        const query = objectToQueryParams.default({
                            "status": 'SUCCESS',
                            "orderid": merchantTransactionId
                        });
                        //res.redirect('/?' + query);
                        return res.redirect(url + '/?' + query)
                    }
                } else if (response.data.success === false) {
                  if (response.data.data.state == "FAILED") {
                    //console.log("router payments status fail")
                    const url = `${process.env.ML_URL}/paymentstatus`
                    const query = objectToQueryParams.default({
                         "status": 'FAILED',
                         "orderid": merchantTransactionId
                    });
                    //res.redirect('/?' + query);
                    return res.redirect(url + '/?' + query)
                  }
                } else {
                    const url = `${process.env.ML_URL}/paymentstatus`
                    const query = objectToQueryParams.default({
                         "status": 'FAILED',
                         "orderid": merchantTransactionId
                    });
                    //res.redirect('/?' + query);
                    return res.redirect(url + '/?' + query)
                }
            } else {
                //console.log("data.response empty")
                const url = `${process.env.ML_URL}/paymentstatus`
                const query = objectToQueryParams.default({
                    "status": 'FAILED',
                    "orderid": merchantTransactionId
                });
                //res.redirect('/?' + query);
                return res.redirect(url + '/?' + query)
            }
        })
        .catch((error) => {
            //console.log("payment status error::", error)
            //console.error(error);
            const url = `${process.env.ML_URL}/paymentstatus`
            const query = objectToQueryParams.default({
                "status": 'FAILED',
                "orderid": merchantTransactionId
            });
            //res.redirect('/?' + query);
            return res.redirect(url + '/?' + query)
        });
    } catch (error) {
        //console.log("router payments status error", error)
        const url = `${process.env.ML_URL}/paymentstatus`
        const query = objectToQueryParams.default({
            "status": 'FAILED',
            "orderid": merchantTransactionId
        });
        //res.redirect('/?' + query);
        return res.redirect(url + '/?' + query)
    }
});

// Get Payments //PhonePe
routerPayments.post('/phonepe/get-payments', /* auth, */ async (req, res) => {
    console.log("router phonepe get-payments status")
    const { userid, emailid, order_id, setonetimefeespaid } = req.body;
    let onetimefeesset = false
    let paymentrecorded = false
    let addaddonssuccess = false
    let addsubscriptionsuccess = false
    let referencenumber
    let transactiondatetime
    var index = 0
    //console.log("router getpayments userid", userid)
    //console.log("router getpayments emailid", emailid)
    //console.log("router getpayments order_id", order_id)
    //console.log("router getpayments setonetimefeespaid", setonetimefeespaid)
    //console.log("req.body.addonsdata", req.body.addonsdata)
    //console.log("req.body.subcriptiondata", req.body.subscriptiondata)
    
    let salt_key = process.env.SALT_KEY
    let merchant_id = process.env.MERCHANT_ID

    const merchantTransactionId = order_id
    const merchantId = merchant_id

    const keyIndex = 1;
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + salt_key;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + "###" + keyIndex;

    const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1"
    const preprod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1"

    const options = {
        method: 'GET',
        url: `${prod_URL}/status/${merchantId}/${merchantTransactionId}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': `${merchantId}`
        }
    };

    try {
        console.log("router get-payments status try..")
        axios.request(options).then(async (response) => {
            //console.log("2 payment response ::", response)
            console.log("2 payment response data::", response.data)
            if (!isEmpty(response.data)) {
                if (response.data.success === true) {
                    if (response.data.data.responseCode == "SUCCESS" && response.data.data.state == "COMPLETED") {
                        if (setonetimefeespaid == true) {
                            const result = await db.query("UPDATE users SET onetimefeespaid = $1 where userid = $2",
                            [ 
                              't',
                               userid
                            ]);
        
                            if (result?.rowCount == 1) {
                                onetimefeesset = true
                            }
                        }
                        if (req.body.addonsdata != null) {
                            const addonsresults = await db.query("UPDATE users SET addons = $1 where userid = $2",
                            [
                              JSON.stringify(req.body.addonsdata), 
                              req.params.userid
                            ]);
    
                            if (addonsresults?.rowCount == 1) {
                                addaddonssuccess = true
                            }
                        }
                        
                        if (req.body.subscriptiondata != null) {
                            const subscriptionresults = await db.query("UPDATE users SET subscriptioninfo = $1 where userid = $2",
                            [
                              JSON.stringify(req.body.subscriptiondata), 
                              req.params.userid
                            ]);
    
                            if (subscriptionresults?.rowCount == 1) {
                                addsubscriptionsuccess = true
                            }
                        }

                        //
                        // Record Payment
                        //
                        if (response.data.data.paymentInstrument.type == 'UPI') {
                            referencenumber = response.data.data.paymentInstrument.utr
                        } else {
                            referencenumber = response.data.data.paymentInstrument.pgTransactionId
                        }
                        if (isEmpty(referencenumber)) {
                            referencenumber = 123456
                        }
                        transactiondatetime = new Date(Date.now()).toISOString().replace('T',' ').replace('Z','');

                        let paymentobj = {
                            paymentstatus: "SUCCESS",
                            orderid: response?.data.data.merchantTransactionId,
                            ordertransactionid: response?.data.data.transactionId,
                            paymentamount: response?.data.data.amount,
                            paymentid: response?.data.data.transactionId,
                            transactiondate: transactiondatetime,
                            referencenumber: referencenumber
                        }

                        console.log("paymentobj::", paymentobj)

                        //console.log("transactiondatetime:", transactiondatetime)
                        const transactionresult = await db.query("INSERT INTO transactions (transaction_id, userid, \
                                                                    order_id, \
                                                                    order_transactionid, \
                                                                    order_amount, \
                                                                    transaction_date, \
                                                                    transaction_status, \
                                                                    reference_number, \
                                                                    useremail) \
                                                                    VALUES (nextval('transactions_seq'), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING transaction_id",
                                                                    [ 
                                                                        userid,
                                                                        paymentobj.orderid,
                                                                        paymentobj.ordertransactionid,
                                                                        paymentobj.paymentamount/100,  //convert to rupees
                                                                        transactiondatetime,
                                                                        paymentobj.paymentstatus,
                                                                        referencenumber,
                                                                        emailid
                                                                    ]);

                        console.log("transactionresult::", transactionresult.rowCount)

                        if (transactionresult.rowCount == 1) {
                           paymentrecorded = true
                        }

                        //
                        // INVOICE 
                        //
                        console.log("record payment INVOICE")
                        /*let filenameinvoice
                        createInvoice(userid, name, city, state, paymentobj.paymentamount/100, referencenumber).then(async (fileout) => {
                            filenameinvoice = path.basename(fileout[0]);
                            const filenameext = path.extname(fileout[0]);

                            //
                            //
                            //

                            var dir = `${os.tmpdir()}/files/invoices/${userid}`;
                            chokidar.watch(dir, {
                            persistent: true
                            }).on('add', async (event, path) => {
                            //console.log(`File ${path} has been added`, path, event)
                            index = index + 1
                            console.log("index index value", index)
                            if (index == 1) {
                                let loc = await uploadInvoice(userid, filenameinvoice, fileout[0], 'pdf');
                            }
                            
                            //
                            // Send Email
                            //
                            /*if (emailid != null && name != null) {
                                console.log("record-payment before sendemail")
                                await sendNewEmail({
                                    email: 'santhosh.betha@gmail.com', //emailid, 
                                    subject: "Your Payment to Marrylocal", 
                                    html: `<p>Hello <span style="text-transform:capitalize">${name}</span>, We have received your payment, Thank you.</p>
                                    <p>Payment Amount:${parseInt(paymentobj?.paymentamount/100}.00</p>
                                    <p>Reference Number:${paymentobj?.referencenumber}</p>
                                    Regards,
                                    <br>
                                    MarryLocal
                                    `,
                                    filename: filenameinvoice,
                                    filepath: fileout[0]
                                });
                            }*/
                            //});
                        //});

                        return res.status(200).json({
                            paymentstatus: "SUCCESS",
                            orderid: response?.data.data.merchantTransactionId,
                            paymentamount: response?.data.data.amount,
                            paymentid: response?.data.data.transactionId,
                            referencenumber: referencenumber,
                            onetimefeessetonbackend: onetimefeesset,
                            paymentrecordedonbackend: paymentrecorded,
                            addaddonssuccessonbackend: addaddonssuccess,
                            addsubscriptionsuccessonbackend: addsubscriptionsuccess
                        });
                    }
                } else {
                  //should never reach here 
                  console.log("response.data.success false")
                }
            } else {
              console.log("response.data empty")
            }
        }).catch((error) => {
            console.log("get payment status error::", error)
            console.error(error);
            return res.status(500).json(
                {
                    status: "error",
                    message: "Error: " + "get-payments"
                }
            );
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json(
            {
                status: "error",
                message: "Error: " + "get-payments"
            }
        );
    }
});

// PhonePe record-payment
routerPayments.post('/phonepe/record-payment', /* auth, */ async (req, res) => {
    const { userid, name, city, state, emailid, paymentobj } = req.body;
    console.log("record-payment name, userid, emailid", name, userid, emailid)
    console.log("record-payment paymentobj:,", paymentobj)
    var index = 0
    let referencenumber = paymentobj.referencenumber != null ? paymentobj.referencenumber : 12345
    try {
        const transactiondatetime = new Date(Date.now()).toISOString().replace('T',' ').replace('Z','');
        //console.log("transactiondatetime:", transactiondatetime)
        const transactionresult = await db.query("INSERT INTO transactions (transaction_id, userid, \
                                                   order_id, \
                                                   order_transactionid, \
                                                   order_amount, \
                                                   transaction_date, \
                                                   transaction_status, \
                                                   reference_number, \
                                                   useremail) \
                                                   VALUES (nextval('transactions_seq'), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING transaction_id",
                                                   [ 
                                                      userid,
                                                      paymentobj.orderid, //merchantTransactionId
                                                      paymentobj.ordertransactionid,
                                                      paymentobj.paymentamount/100,
                                                      transactiondatetime,
                                                      paymentobj.paymentstatus,
                                                      referencenumber,
                                                      emailid
                                                   ]);

        //
        // INVOICE 
        //
        console.log("record payment INVOICE")
        let filenameinvoice
        createInvoice(userid, name, city, state, paymentobj.paymentamount/100, paymentobj.orderid, referencenumber).then(async (fileout) => {
        filenameinvoice = path.basename(fileout[0]);
        const filenameext = path.extname(fileout[0]);

        //
        //
        //

        var dir = `${os.tmpdir()}/files/invoices/${userid}`;
            chokidar.watch(dir, {
            persistent: true
        }).on('add', async (event, path) => {
            //console.log(`File ${path} has been added`, path, event)
            index = index + 1
            console.log("index index value", index)
            if (index == 1) {
                let loc = await uploadInvoice(userid, filenameinvoice, fileout[0], 'pdf');
            }
            
            //
            // Send Email
            //
            /*if (emailid != null && name != null) {
                console.log("record-payment before sendemail")
                await sendNewEmail({
                    email: 'santhosh.betha@gmail.com', //emailid, 
                    subject: "Your Payment to Marrylocal", 
                    html: `<p>Hello <span style="text-transform:capitalize">${name}</span>, We have received your payment, Thank you.</p>
                    <p>Payment Amount:${parseInt(paymentobj?.paymentamount/100)}.00</p>
                    <p>Reference Number:${paymentobj?.referencenumber}</p>
                    Regards,
                    <br>
                    MarryLocal
                    `,
                    filename: filenameinvoice,
                    filepath: fileout[0]
                });
            }*/
            });
        });
        return res.status(200).json({
            status: "success"
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json(
            {
                status: "error",
                message: "Error: " + "record-payment"
            }
        );
    }
});

module.exports = routerPayments