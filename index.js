#!/usr/bin/env node
const argv = require('yargs').argv;
const exe = require('./lib/main');

async function start(){

    let targetDir = argv.dir;
    let hoist = Boolean(argv.hoist);

    if(targetDir === undefined){
        targetDir = process.cwd();
    }

    try{
        await exe(targetDir, hoist);
    }catch(err){
        console.error(err);
    }
}

start();