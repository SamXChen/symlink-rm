const path = require('path');

const Task = require('../task');
const { isSubDir } = require('../util');
const { 
    getAllSymLinks, 
    replaceSymlinks, 
    addProtectedLink,
    filterLinks,
    getRealPath,
    getNewRealPath,
    updateNewRealPath,
    copyRealPath,
    linkNewPath,
 } = require('./handlers/symlink');

function execute(targetDir = '', hoist = false){

    targetDir = path.resolve(process.cwd(), targetDir);

    if(hoist){
        handleWithHoist(targetDir);
    }else{
        handleWithoutHoist(targetDir);
    }
}

async function handleWithHoist(targetDir){

    console.time('total hoist');
    do{
        let symlinks = await getAllSymLinks(targetDir);
        symlinks = filterLinks(symlinks);
        if(symlinks.length === 0){
            break;
        }
        // 创建任务
        const tasks = await buildHoistTask(targetDir, symlinks);
        await dealHoistTasks(tasks, targetDir);

    }while(true);
    console.timeEnd('total hoist');    
}

async function handleWithoutHoist(targetDir){
    console.time('total');
    do {
        let symlinks = await getAllSymLinks(targetDir);
        symlinks = filterLinks(symlinks);
        if(symlinks.length === 0){
            break;
        }
        await replaceSymlinks(symlinks, targetDir);

    }while(true);
    console.timeEnd('total');
}

async function buildHoistTask(targetDir, links = []){
    const tasks = {};
    const promisesArr = [];
    links.forEach(link => {
        const pro = new Promise(async resolve => {
            const realPath = await getRealPath(link);

            if(isSubDir(targetDir, realPath)){
                // protect link
                addProtectedLink(link);
            }else{
                // update task
                if(tasks[realPath] === undefined){
                    tasks[realPath] = new Task();
                }
                const task = tasks[realPath];
                task.realPath = realPath;
                task.linksArr.push(link);
            }
            resolve();
        });
        promisesArr.push(pro);
    });
    await Promise.all(promisesArr);
    return tasks;
}

async function dealHoistTasks(tasks = {}, targetDir){

    const keys = Object.keys(tasks);
    if(keys.length === 0){
        return;
    }

    const promisesArr = [];

    keys.forEach(key => {
        const task = tasks[key];
        const { realPath, linksArr } = task;
        const pro = new Promise(async resolve => {
            for(let idx = 0; idx < linksArr.length; ++idx){
                const linkPath = linksArr[idx];
                const newRealPath = getNewRealPath(realPath);
                if(newRealPath){
                    // 有 link 记录
                    // 指向 new real path
                    await linkNewPath(linkPath, newRealPath);
                    addProtectedLink(linkPath);
                }else{
                    // 没有 记录
                    // copy 操作
                    // 更新 new real path
                    await copyRealPath(linkPath, realPath, targetDir);
                    updateNewRealPath(realPath, linkPath);
                }
            }
            resolve();
        });
        promisesArr.push(pro);
    });
    await Promise.all(promisesArr);
}

module.exports = execute;