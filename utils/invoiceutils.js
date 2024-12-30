const fs = require('node:fs');
const path = require("path");
const os = require('os');
const { generateInvoicePdf } = require("../utils/pdf-generator");
const { InvoiceNumber } = require('invoice-number');
const AWS = require('aws-sdk');
const dotenv = require("dotenv");
dotenv.config()

const s3 = new AWS.S3({
    endpoint: 'blr1.vultrobjects.com',
    region: 'Bangalore',
    accessKeyId: process.env.ID,
    secretAccessKey: process.env.SECRET
});

const setInvoice = async (year, month, day, number) => {
    const invoicefileOS = `${os.tmpdir()}/files/invoice.json`;
    try {
      const json1 = fs.readFileSync(invoicefileOS, 'utf8')
      console.log("file found in OS dir")
      obj = JSON.parse(json1);
      obj.year = year;
      obj.month = month;
      obj.day = day;
      obj.number = number;
      let newJSON1 = JSON.stringify(obj);
      fs.writeFileSync(invoicefileOS, newJSON1, {encoding: 'utf8', flag: 'w+'});
    } catch (error) {
      console.log("setInvoice: file not found in OS dir", error)
      const json0 = fs.readFileSync(invoicefileOS, 'utf-8');
      let obj = JSON.parse(json0);
      let newJSON2 = JSON.stringify(obj);
      fs.writeFileSync(invoicefileOS, newJSON2, {encoding: 'utf8', flag: 'w+'});
    }
};

const getCurrentInvoice = () => {
    const invoicefileOS = `${os.tmpdir()}/files/invoice.json`;
    try {
      const json1 = fs.readFileSync(invoicefileOS, 'utf8')
      console.log("getCurrentInvoice file found in OS dir")
      let invoiceobj = JSON.parse(json1);
      return invoiceobj
    } catch (error) {
      console.log("getCurrentInvoice: file not found in OS dir", error)
      return 0;
    }
}

const invoiceDetail = {
    client: {
      name: "Micheal",
      city: "Panipat",
      state: "Haryana",
      country: "INDIA"
    },
    total: 100,
    //order_number: 1234222,
    reference_number: 12345,
    header:{
        company_name: "MarryLocal",
        company_logo: "logo1.png",
        company_address: "INDIA"
    },
    footer:{
      text: "Thank You"
    },
    currency_symbol:"₹", 
    //date: {
    //  billing_date: "14 January 2024"
    //},
    invoiceNumber: ""
};

const createInvoice = async (userid, name, city, state, amount, orderid, referencenumber) => {
    console.log("createInvoice __dirname:",__dirname)
    var dir = `${os.tmpdir()}/invoices/${userid}`;

    invoiceDetail.client.name = name?.charAt(0).toUpperCase() + name?.slice(1);
    invoiceDetail.client.city = city;
    invoiceDetail.client.state = state;
    invoiceDetail.total = amount + amount * 0.18;
    invoiceDetail.order_number = orderid;
    invoiceDetail.reference_number = referencenumber
    
    let newinvoicenumber;
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    try {
        const datenow = new Date();
        let year = datenow.getFullYear();
        let month = datenow.getMonth() + 1; //because getMonth() returns '0' based values
        let day = datenow.getDate();

        //let invoiceNumber = InvoiceNumber.next(`${year}/${month}/${day}/ML00001`);  //2017/08/ABC001
        //2017/08/ABC001//InvoiceNumber.next(`2024/03/30/ML00000`);
        let currentinvoiceobj = getCurrentInvoice()

        if (currentinvoiceobj == 0) {
          newinvoicenumber = `${year}-${month}-${day}-ML00001`
          setInvoice(year, month, day, 'ML00001')
        } else {
//
          if (currentinvoiceobj.year != year || currentinvoiceobj.month != month || currentinvoiceobj.day != day) {
            newinvoicenumber = `${year}-${month}-${day}-ML00001`
          } else {
            newinvoicenumber = InvoiceNumber.next(`${currentinvoiceobj.year}-${currentinvoiceobj.month}-${currentinvoiceobj.day}-${currentinvoiceobj.number}`);
          }
          setInvoice(year, month, day, newinvoicenumber.slice(-7))
        } 
        
        invoiceDetail.invoiceNumber = newinvoicenumber;
        const fileName = 'ML-INVOICE-' + newinvoicenumber + '.pdf'
        const filePath = path.join(dir, `${fileName}`);

        generateInvoicePdf(invoiceDetail, filePath);

        const files = [filePath];

        return files
    } catch (error) {
      return 0;
    }
}

const uploadInvoice =  async (userid, filename, filepathin, type) => {
  // Read content from the file

  var dir = `${os.tmpdir()}/files/invoices/${userid}`;
  const filePath = path.join(dir, `${filename}`);

  try {
    const fileContent = fs.readFileSync(`${filePath}`);

    // Setting up S3 upload parameters
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: `invoices/${userid}/${filename}`, //File name you want to save as in S3
      Body: fileContent,
      //ACL: 'public-read',
      ContentType: 'application/pdf'
    };

    const uploadedPdf = await s3.upload(params).promise()
    console.log(`Invoice uploaded successfully. ${uploadedPdf.Location}`);
    return true
   // return uploadedPdf.Location

  } catch {
    console.log('uploadInvoice: File does not exist');
    return false
  }
};
module.exports = {setInvoice, getCurrentInvoice, createInvoice, uploadInvoice}

