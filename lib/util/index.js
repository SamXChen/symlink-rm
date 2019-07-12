const path = require('path');

function isSubDir(parent, child){
    const res = path.relative(parent, child);
    if(res.indexOf('..') > -1){
        return false;
    }else{
        return true;
    }
}

module.exports = {
    isSubDir,
};