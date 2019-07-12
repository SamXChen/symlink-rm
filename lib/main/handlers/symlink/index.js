const globby = require('globby');
const isSymbolicLink = require('is-symbolic-link');
const fs = require('fs-extra');
const path = require('path');

const { isSubDir } = require('../../../util');

const protectedLinks = [];
const cacheLinksRealPath = {};
const cacheNewRealPath = {};

async function getAllSymLinks(targetDir){
    const links = [];
    const files = await globby(targetDir, { onlyFiles: false });
    
    const promisesArr = [];
    files.forEach(fp => {
        fp = path.resolve('', fp);
        const pro = isSymbolicLink(fp).then(res => {
            if(res){
                links.push(fp);
            }
        });
        promisesArr.push(pro);
    });

    await Promise.all(promisesArr);

    return links;
}

function filterLinks(links){
    const result = [];
     // 排除链接中任意的子链接 和 受保护的链接
     links.forEach(link => {
        let isValid = true;
        if(protectedLinks.indexOf(link) > -1){
            isValid = false;
        }
        if(isValid){
            links.forEach(checkLink => {
                if(link !== checkLink){
                    if(isSubDir(checkLink, link)){
                        isValid = false;
                    }
                }
            });
        }
        if(isValid){
            result.push(link);
        }
    });
    return result;
}

function getNewRealPath(realPath){
    return cacheNewRealPath[realPath];
}

function updateNewRealPath(realPath, newRealPath){
    cacheNewRealPath[realPath] = newRealPath;
}

async function getRealPath(link){
    let realPath;
    realPath = cacheLinksRealPath[link];

    if(realPath === undefined){
        realPath = await fs.realpath(link);
    }
    return realPath;
}

async function updateRealPathToCache(link, realPath){

    console.log(`update real path cache: ${link} to ${realPath}`);

    cacheLinksRealPath[link] = realPath;
}

async function updateRealPathesToCache(links, targetLink, srcDir){
    const promisesArr = [];
    links.forEach(link => {
        const pro = new Promise(async resolve => {
            const realPath = await fs.realpath(link);
            // replace link with target link
            const relLinkPath = link.replace(srcDir, '');
            const newLink = path.join(targetLink, relLinkPath);
            updateRealPathToCache(newLink, realPath);

            resolve();
        });
        promisesArr.push(pro);
    });
    await promisesArr;
}

async function copyRealPath(link, realPath, targetDir){

    const stat = await fs.lstat(realPath);

    if(stat.isDirectory()){
        if(isSubDir(targetDir, realPath)){
            // protect link
            addProtectedLink(link);
        }else{
            // 获取 real-path 目录下所有 link
            const newLinks = await getAllSymLinks(realPath);
            await updateRealPathesToCache(newLinks, link, realPath);
        }
    }

     // 落实更新操作
     console.info(`copying from ${realPath} to ${link} \n`);
     try{
        await fs.unlink(link);
     }catch(err){
        console.warn(err);
     }finally{
        await fs.copy(realPath, link);
     }
}

async function linkNewPath(link, newPath){
    console.info(`create new link: ${link} to ${newPath} \n`);
    try{
        await fs.unlink(link);
    }catch(err){
        console.warn(err);
    }finally{
        let target = newPath;
        target = path.relative(path.join(link, '..'), newPath);

        console.log(target);
        await fs.symlink(target, link);
    }
}

async function replaceSymlinks(links = [], targetDir){
    const promisesArr = [];
    links.forEach(link => {
        const pro = new Promise(async (resolve, reject) => {
            try{
                const realPath = await getRealPath(link);
                await copyRealPath(link, realPath, targetDir);
                resolve();
            }catch(err){
                console.warn(err);
                reject();
            }
        });
        promisesArr.push(pro);
    });
    await Promise.all(promisesArr);
}

async function addProtectedLink(link){
    if(protectedLinks.indexOf(link) < 0){
        protectedLinks.push(link);
    }
}

module.exports = {
    getAllSymLinks,
    replaceSymlinks,
    addProtectedLink,
    filterLinks,
    getRealPath,
    copyRealPath,
    getNewRealPath,
    updateNewRealPath,
    linkNewPath,
}