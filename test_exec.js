const { exec } = require("child_process");
const path = require("path");
const scriptPath = path.join(__dirname, "evoff.sh");
console.log("Executing:", `bash "${scriptPath}"`);
exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
    console.log("--- ERROR ---");
    console.log(error);
    console.log("--- STDERR ---");
    console.log(stderr);
    console.log("--- STDOUT ---");
    console.log(stdout);
});
