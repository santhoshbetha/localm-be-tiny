const fs = require("fs");
const PDFDocument = require("pdfkit");

function generateInvoicePdf(invoice, path) {
    let doc = new PDFDocument({ size: "A4", margin: 50 });

    generateHeader(doc, invoice);
    generateCustomerInformation(doc, invoice);
    generateInvoiceTable(doc, invoice);
    generateFooter(doc, invoice);

    doc.end();
    doc.pipe(fs.createWriteStream(path));
}

function generateHeader(doc, invoice) {
    if (fs.existsSync(invoice.header.company_logo)) {
        doc.image(invoice.header.company_logo, 50, 45, { width: 50 })
           .fontSize(20)
           .text(invoice.header.company_name, 110, 57)
           .moveDown();
    } else {
        doc.fontSize(20)
           .text(invoice.header.company_name, 50, 45)
           .moveDown()
    }

    if (invoice.header.company_address.length!==0) {
       companyAddress(doc, invoice.header.company_address);
    }
}

function generateCustomerInformation(doc, invoice) {
    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160);

    generateHr(doc, 185);

    const customerInformationTop = 200;

    doc
        .fontSize(10)
        .text("Invoice Number:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(invoice.invoiceNumber, 150, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 50, customerInformationTop + 15)
        .text(formatDate(new Date()), 150, customerInformationTop + 15)
        .text("Order Id:", 50, customerInformationTop + 30)
        .text(invoice.order_number, 150, customerInformationTop + 30)
        .text("Payment Reference:", 50, customerInformationTop + 45)
        .text(invoice.reference_number, 150, customerInformationTop + 45)
        .text(invoice.client.name, 300, customerInformationTop)
        .font("Helvetica")
        .text(
            invoice.client.city +
            ", " +
            invoice.client.state +
            ", " +
            "INDIA",
            300,
            customerInformationTop + 15
        )
        .moveDown();

    generateHr(doc, 267);
}

function generateInvoiceTable(doc, invoice) {
    let i = 0;
    const invoiceTableTop = 330;
    //const currencySymbol = invoice.currency_symbol;
    //const { client } = invoice;
    //const { pricePerSession } = client;

    /*doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Item",
        "Description",
        "Unit Cost",
        "Quantity",
        "Total",
        "Tax"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    for (i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.item,
            item.description,
            formatCurrency(pricePerSession),
            item.quantity,
            formatCurrency(item.amountSum),
            checkIfTaxAvailable(item.tax)
        );

        generateHr(doc, position + 20);
    }*/

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    const paidToDatePosition = subtotalPosition + 20;
    doc.font("Helvetica-Bold");
    totalTable(
      doc,
      paidToDatePosition,
      "Total",
      //formatCurrency(invoice.total, currencySymbol)
      formatCurrency(invoice.total)
    );
}

function generateFooter(doc, invoice) {
    if (invoice.footer.text.length !== 0) {
        doc.fontSize(10).text(invoice.footer.text, 50, 750, { align: "center", width: 500 });
    } 
}

let totalTable = (
    doc,
    y,
    name,
    description
)=>{
    doc
    .fontSize(10)
    .text(name, 400, y,{ width: 90, align: "right" })
    .text(description, 0, y, { align: "right" })
}

function generateTableRow(
    doc,
    y,
    item,
    description,
    unitCost,
    quantity,
    lineTotal
) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(description, 150, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
}

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

function formatCurrency(val) {
    return "₹" + (val).toFixed(2);
}

function formatDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return year + "/" + month + "/" + day;
}

let getNumber =  str =>  { 
    if (str.length!==0) {
      var num = str.replace(/[^0-9]/g, ''); 
    } else {
      var num = 0;
    }
    
    return num; 
}

let checkIfTaxAvailable = tax => {
    let validatedTax = getNumber(tax);
    if (Number.isNaN(validatedTax) === false && validatedTax <= 100 && validatedTax > 0){
        var taxValue = tax;  
    } else {
        var taxValue = '---';
    }

    return taxValue;
}

let companyAddress = (doc, address) => {
    let str = address;
    let chunks = str.match(/.{0,25}(\s|$)/g);
    let first = 50;
    chunks.forEach(function (i,x) {
        doc.fontSize(10).text(chunks[x], 200, first, { align: "right" });
        first = +first +  15;
    });
}

module.exports = {
    generateInvoicePdf
};