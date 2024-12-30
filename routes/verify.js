const express = require("express");
const routerVerify = express.Router();
const os = require('os');
const path = require("path");
const sharp = require('sharp');
const fs = require('fs');
const { copyFile } = require('node:fs/promises');
const { ocrSpace } = require('ocr-space-api-wrapper');

const parseFile = async (filepath) => {
    //const res2 = await ocrSpace(filepath, {apiKey: process.env.OCR_KEY ,
    //    OCREngine: 3, scale: true, //isTable: true
    // });
    const res2 = await ocrSpace(filepath, { apiKey: process.env.OCR_KEY });
    return res2;
}

routerVerify.post('/idverify', async (req, res, next) => {
    const values = Object.values(req.files);
    let imagedata = req.files

    values.map(async (image) => {
        //console.log("image::", image)
        const filename = path.basename(imagedata.idimage.path)
        //console.log("filename:", filename)
        try {
            await copyFile(imagedata.idimage.path, `${os.tmpdir()}/uploadstemp/${filename}`)
            imagedata.idimage.path = `${os.tmpdir()}/uploadstemp/${filename}`;

            const imgtype = imagedata.idimage.type.slice(6) //(slice 'jpeg' from image/jpeg )
            const localpath = `${os.tmpdir()}/uploads/` + `idimage.`  + imgtype;
            //console.log(localpath)
            if (imagedata.idimage.size > 999999) { //1MB limit for OCR size on free plan
                // resize and upload
                console.log("resizing")
                await sharp(imagedata.idimage.path).resize(800).toFile(localpath);
            } else {
                await sharp(imagedata.idimage.path).toFile(localpath);
            }
            // Using the OCR.space default free API key (max 10reqs in 10mins) + remote file
            //const res1 = await ocrSpace('http://dl.a9t9.com/ocrbenchmark/eng.png');

            // Using your personal API key + local file
            //const res2 = await ocrSpace(localpath, { apiKey: 'K86246878988957' });
            const parseRes = await parseFile(localpath)
            
            // Delete files
            fs.unlink(localpath, (err) => {
                if (err) {
                    //throw err;
                console.log("Delete ID image Failure 1.");
                }
                console.log("Deleted ID image successfully 1.");
            });
            fs.unlink(imagedata.idimage.path, (err) => {
                if (err) {
                    //throw err;
                console.log("Delete ID image Failure 2.");
                }
                console.log("Deleted ID image successfully 2.");
            });

            return res.status(200).json({
                status: "success",
                data: parseRes
            })
        // Using your personal API key + base64 image + custom language
        //const res3 = await ocrSpace('data:image/png;base64...', { apiKey: '<API_KEY_HERE>', language: 'ita' });
        } catch (error) {
            // Delete files
            fs.unlink(localpath, (err) => {
                if (err) {
                    //throw err;
                    console.log("Delete ID image Failure 3.");
                }
                console.log("Deleted ID image successfully 3.");
            });
            fs.unlink(imagedata.idimage.path, (err) => {
                if (err) {
                    //throw err;
                    console.log("Delete ID image Failure 4.");
                }
                console.log("Deleted ID image successfully 4.");
            });
            //console.log("OCR Error:", error)
            return res.status(500).json(
            {
                status: "error",
                message: "Error: " + "OCR error"
            });
        }
    })
});

module.exports = routerVerify
  