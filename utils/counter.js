const fs = require('fs');
const os = require('os');

const incrementCounter = async () => {
   const counterfileOS = `${os.tmpdir()}/files/counter.json`;
    try {
      const json1 = fs.readFileSync(counterfileOS, 'utf8')
      console.log("file found in OS dir")
      obj = JSON.parse(json1);
      obj.emailcount = obj.emailcount + 1;
      let newJSON1 = JSON.stringify(obj);
      fs.writeFileSync(counterfileOS, newJSON1, {encoding: 'utf8', flag: 'w+'});
    } catch (error) {
      console.log("file not found in OS dir", error);
      const counterfilelocal = `${os.tmpdir()}/files/counter.json`;
      const json0 = fs.readFileSync(counterfilelocal, 'utf-8');
      let obj = JSON.parse(json0);
      obj = JSON.parse(json0);
      obj.emailcount = obj.emailcount + 1;
      let newJSON2 = JSON.stringify(obj);
      fs.writeFileSync(counterfileOS, newJSON2, {encoding: 'utf8', flag: 'w+'});
    }
};

const emailCount = async () => {
  const counterfileOS = `${os.tmpdir()}/files/counter.json`;
  try {
    const json1 = fs.readFileSync(counterfileOS, 'utf8')
    let obj = JSON.parse(json1);
    console.log("getEmailcount file found in OS dir: emailcount::", Number(obj.emailcount))
    return Number(obj.emailcount)
  } catch (error) {
    console.log("getEmailcount file not found in OS dir", error)
    return 0;
  }
}

const resetCounter = async () => {
  const counterfilelocal = `${os.tmpdir()}/files/counter.json`;
  const counterfileOS = `${os.tmpdir()}/files/counter.json`;
  const json0 = fs.readFileSync(counterfilelocal, 'utf-8');
  let obj = JSON.parse(json0);
  let newJSON = JSON.stringify(obj);

  fs.writeFileSync(counterfileOS, newJSON, {encoding: 'utf8', flag: 'w+'});
}

module.exports = {incrementCounter, emailCount, resetCounter}

