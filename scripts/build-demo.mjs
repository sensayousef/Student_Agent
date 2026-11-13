import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const read=name=>readFileSync(new URL("../src/web/"+name,import.meta.url),"utf8").replace(/\r\n/g,"\n");
const sample=Buffer.from(read("sample-moodle.ics")).toString("base64");
const script=["data.js","domain.js","icons.js","app.js"].map(file=>read(file)
  .replace(/^import .+;\r?\n/gm,"")
  .replace(/^export /gm,"")
  .replace('new URL("./sample-moodle.ics",location.href)',JSON.stringify("data:text/calendar;base64,"+sample))
  .replace('href="./sample-moodle.ics"','href="${sampleCalendarUrl}"'))
  .join("\n");
const css=read("styles.css").replace(/^@import[^\n]+\n/,"");
const html=read("index.html")
  .replace('<link rel="stylesheet" href="./styles.css">',()=>"<style>\n"+css+"\n</style>")
  .replace('<script type="module" src="./app.js"></script>',()=>'<script type="module">\n'+script+'\n</script>');
const output=resolve(process.argv[2]??"build/Campus-Compass-Demo.html");
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,html);
console.log(output);
