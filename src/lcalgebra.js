/*

    NUMBER: a

    {
        type: "NUMBER",
        value: bigInt(a)
    }

    LINEARCOMBINATION:  c1*s1 + c2*s2 + c3*s3

    {
        type: "LINEARCOMBINATION",
        values: {
            s1: bigInt(c1),
            s2: bigInt(c2),
            s3: bigInt(c3)
        }
    }


    QEQ: a*b + c WHERE a,b,c are LINEARCOMBINATION
    {
        type: "QEQ"
        a: { type: LINEARCOMBINATION, values: {...} },
        b: { type: LINEARCOMBINATION, values: {...} },
        c: { type: LINEARCOMBINATION, values: {...} }
    }
 */

/*
+       NUM     LC      QEQ
NUM     NUM     LC      QEQ
LC      LC      LC      QEQ
QEQ     QEQ     QEQ     ERR

*       NUM     LC      QEQ
NUM     NUM     LC      QEQ
LC      LC      QEQ     ERR
QEQ     QEQ     ERR     ERR
*/

const bigInt = require("big-integer");
const __P__ = new bigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

exports.add = add;
exports.mul = mul;
exports.evaluate = evaluate;
exports.negate = negate;
exports.sub = sub;
exports.toQEQ = toQEQ;
exports.isZero = isZero;
exports.toString = toString;
exports.canonize = canonize;

function signal2lc(a) {
    let lc;
    if (a.type == "SIGNAL") {
        lc = {
            type: "LINEARCOMBINATION",
            values: {}
        };
        lc.values[a.fullName] = bigInt(1);
        return lc;
    } else {
        return a;
    }
}

function clone(a) {
    const res = {};
    res.type = a.type;
    if (a.type == "NUMBER") {
        res.value = bigInt(a.value);
    } else if (a.type == "LINEARCOMBINATION") {
        res.values = {};
        for (let k in a.values) {
            res.values[k] = bigInt(a.values[k]);
        }
    } else if (a.type == "QEQ") {
        res.a = clone(a.a);
        res.b = clone(a.b);
        res.c = clone(a.c);
    } else if (a.type == "ERROR") {
        res.errStr = a.errStr;
    } else {
        res.type = "ERROR";
        res.errStr = "Invilid type when clonning: "+a.type;
    }
    return res;
}

function add(_a, _b) {
    const a = signal2lc(_a);
    const b = signal2lc(_b);
    if (a.type == "ERROR") return a;
    if (b.type == "ERROR") return b;
    if (a.type == "NUMBER") {
        if (b.type == "NUMBER") {
            return addNumNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return addLCNum(b,a);
        } else if (b.type=="QEQ") {
            return addQEQNum(b,a);
        } else {
            return { type: "ERROR", errStr: "LC Add Invalid Type 2: "+b.type };
        }
    } else if (a.type=="LINEARCOMBINATION") {
        if (b.type == "NUMBER") {
            return addLCNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return addLCLC(a,b);
        } else if (b.type=="QEQ") {
            return addQEQLC(b,a);
        } else {
            return { type: "ERROR", errStr: "LC Add Invalid Type 2: "+b.type };
        }
    } else if (a.type=="QEQ") {
        if (b.type == "NUMBER") {
            return addQEQNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return addQEQLC(a,b);
        } else if (b.type=="QEQ") {
            return { type: "ERROR", errStr: "QEQ + QEQ" };
        } else {
            return { type: "ERROR", errStr: "LC Add Invalid Type 2: "+b.type };
        }
    } else {
        return { type: "ERROR", errStr: "LC Add Invalid Type 1: "+a.type };
    }
}

function addNumNum(a,b) {
    if (!a.value || !b.value) return { type: "NUMBER" };
    return {
        type: "NUMBER",
        value: a.value.add(b.value).mod(__P__)
    };
}

function addLCNum(a,b) {
    let res = clone(a);
    if (!b.value) {
        return { type: "ERROR", errStr: "LinearCombination + undefined" };
    }
    if (b.value.isZero()) return res;
    if (!res.values["one"]) {
        res.values["one"]=bigInt(b.value);
    } else {
        res.values["one"]= res.values["one"].add(b.value).mod(__P__);
    }
    return res;
}

function addLCLC(a,b) {
    let res = clone(a);
    for (let k in b.values) {
        if (!res.values[k]) {
            res.values[k]=bigInt(b.values[k]);
        } else {
            res.values[k]= res.values[k].add(b.values[k]).mod(__P__);
        }
    }
    return res;
}

function addQEQNum(a,b) {
    let res = clone(a);
    res.c = addLCNum(res.c, b);
    if (res.c.type == "ERROR") return res.c;
    return res;
}

function addQEQLC(a,b) {
    let res = clone(a);
    res.c = addLCLC(res.c, b);
    if (res.c.type == "ERROR") return res.c;
    return res;
}

function mul(_a, _b) {
    const a = signal2lc(_a);
    const b = signal2lc(_b);
    if (a.type == "ERROR") return a;
    if (b.type == "ERROR") return b;
    if (a.type == "NUMBER") {
        if (b.type == "NUMBER") {
            return mulNumNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return mulLCNum(b,a);
        } else if (b.type=="QEQ") {
            return mulQEQNum(b,a);
        } else {
            return { type: "ERROR", errStr: "LC Mul Invalid Type 2: "+b.type };
        }
    } else if (a.type=="LINEARCOMBINATION") {
        if (b.type == "NUMBER") {
            return mulLCNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return mulLCLC(a,b);
        } else if (b.type=="QEQ") {
            return { type: "ERROR", errStr: "LC * QEQ" };
        } else {
            return { type: "ERROR", errStr: "LC Mul Invalid Type 2: "+b.type };
        }
    } else if (a.type=="QEQ") {
        if (b.type == "NUMBER") {
            return mulQEQNum(a,b);
        } else if (b.type=="LINEARCOMBINATION") {
            return { type: "ERROR", errStr: "QEC * LC" };
        } else if (b.type=="QEQ") {
            return { type: "ERROR", errStr: "QEQ * QEQ" };
        } else {
            return { type: "ERROR", errStr: "LC Mul Invalid Type 2: "+b.type };
        }
    } else {
        return { type: "ERROR", errStr: "LC Mul Invalid Type 1: "+a.type };
    }
}


function mulNumNum(a,b) {
    if (!a.value || !b.value) return { type: "NUMBER" };
    return {
        type: "NUMBER",
        value: a.value.times(b.value).mod(__P__)
    };
}

function mulLCNum(a,b) {
    let res = clone(a);
    if (!b.value) {
        return {type: "ERROR", errStr: "LinearCombination * undefined"};
    }
    for (let k in res.values) {
        res.values[k] = res.values[k].times(b.value).mod(__P__);
    }
    return res;
}

function mulLCLC(a,b) {
    return {
        type: "QEQ",
        a: clone(a),
        b: clone(b),
        c: { type: "LINEARCOMBINATION", values: {}}
    };
}

function mulQEQNum(a,b) {
    let res = {
        type: "QEQ",
        a: mulLCNum(a.a, b),
        b: clone(a.b),
        c: mulLCNum(a.c, b)
    };
    if (res.a.type == "ERROR") return res.a;
    if (res.c.type == "ERROR") return res.a;
    return res;
}

function getSignalValue(ctx, signalName) {
    const s = ctx.signals[signalName];
    if (s.equivalence != "") {
        return getSignalValue(ctx, s.equivalence);
    } else {
        const res = {
            type: "NUMBER"
        };
        if (s.value) {
            res.value = s.value;
        }
        return res;
    }
}

function evaluate(ctx, n) {
    if (n.type == "NUMBER") {
        return n;
    } else if (n.type == "SIGNAL") {
        return getSignalValue(ctx, n.fullName);
    } else if (n.type == "LINEARCOMBINATION") {
        const v= {
            type: "NUMBER",
            value: bigInt(0)
        };
        for (let k in n.values) {
            const s = getSignalValue(ctx, k);
            if (s.type != "NUMBER") return {type: "ERROR", errStr: "Invalid signal in linear Combination: " + k};
            if (!s.value) return { type: "NUMBER" };
            v.value = v.value.add( n.values[k].times(s.value)).mod(__P__);
        }
        return v;
    } else if (n.type == "QEQ") {
        const a = evaluate(ctx, n.a);
        if (a.type == "ERROR") return a;
        if (!a.value) return { type: "NUMBER" };
        const b = evaluate(ctx, n.b);
        if (b.type == "ERROR") return b;
        if (!b.value) return { type: "NUMBER" };
        const c = evaluate(ctx, n.c);
        if (c.type == "ERROR") return c;
        if (!c.value) return { type: "NUMBER" };

        return {
            type: "NUMBER",
            value: (a.value.times(b.value).add(c.value)).mod(__P__)
        };
    } else if (n.type == "ERROR") {
        return n;
    } else {
        return {type: "ERROR", errStr: "Invalid type in evaluate: "+n.type};
    }
}

function negate(_a) {
    const a = signal2lc(_a);
    let res = clone(a);
    if (res.type == "NUMBER") {
        res.value = __P__.minus(a.value).mod(__P__);
    } else if (res.type == "LINEARCOMBINATION") {
        for (let k in res.values) {
            res.values[k] = __P__.minus(res.values[k]).mod(__P__);
        }
    } else if (res.type == "QEQ") {
        res.a = negate(res.a);
        res.c = negate(res.c);
    } else if (res.type == "ERROR") {
        return res;
    } else {
        res = {type: "ERROR", errStr: "LC Negate invalid Type: "+res.type};
    }
    return res;
}

function sub(a, b) {
    return add(a, negate(b));
}

function toQEQ(a) {
    if (a.type == "NUMBER") {
        return {
            type: "QEQ",
            a: {type: "LINEARCOMBINATION", values: {}},
            b: {type: "LINEARCOMBINATION", values: {}},
            c: {type: "LINEARCOMBINATION", values: {"one": bigInt(a.value)}}
        };
    } else if (a.type == "LINEARCOMBINATION") {
        return {
            type: "QEQ",
            a: {type: "LINEARCOMBINATION", values: {}},
            b: {type: "LINEARCOMBINATION", values: {}},
            c: clone(a)
        };
    } else if (a.type == "QEQ") {
        return clone(a);
    } else if (a.type == "ERROR") {
        return clone(a);
    } else {
        return {type: "ERROR", errStr: "toQEQ invalid Type: "+a.type};
    }
}

function isZero(a) {
    if (a.type == "NUMBER") {
        return a.value.isZero();
    } else if (a.type == "LINEARCOMBINATION") {
        for (let k in a.values) {
            if (!a.values[k].isZero()) return false;
        }
        return true;
    } else if (a.type == "QEQ") {
        return (isZero(a.a) || isZero(a.b)) && isZero(a.c);
    } else if (a.type == "ERROR") {
        return false;
    } else {
        return false;
    }
}

function toString(a, ctx) {
    if (a.type == "NUMBER") {
        return a.value.toString();
    } else if (a.type == "LINEARCOMBINATION") {
        let S="";
        for (let k in a.values) {
            if (!a.values[k].isZero()) {
                let c;
                if (a.values[k].greater(__P__.divide(2))) {
                    S = S + "-";
                    c = __P__.minus(a.values[k]);
                } else {
                    if (S!="") S=S+" + ";
                    c = a.values[k];
                }
                if (!c.equals(1)) {
                    S = S + c.toString() + "*";
                }
                let sigName = k;
                if (ctx) {
                    while (ctx.signals[sigName].equivalence) sigName = ctx.signals[sigName].equivalence;
                }
                S =  S + sigName;
            }
        }
        if (S=="") return "0"; else return S;
    } else if (a.type == "QEQ") {
        return "( "+toString(a.a, ctx)+" )  *  ( "+toString(a.b, ctx)+" ) + " + toString(a.c, ctx);
    } else if (a.type == "ERROR") {
        return "ERROR: "+a.errStr;
    } else {
        return "INVALID";
    }
}

function canonize(ctx, a) {
    if (a.type == "LINEARCOMBINATION") {
        for (let k in a.values) {
            let s = k;
            while (ctx.signals[s].equivalence) s= ctx.signals[s].equivalence;
            if (s != k) {
                if (!a.values[s]) {
                    a.values[s]=bigInt(a.values[k]);
                } else {
                    a.values[s]= a.values[s].add(a.values[k]).mod(__P__);
                }
                delete a.values[k];
            }
        }
        for (let k in a.values) {
            if (a.values[k].isZero()) delete a.values[k];
        }
        return a;
    } else if (a.type == "QEQ") {
        a.a = canonize(ctx, a.a);
        a.b = canonize(ctx, a.b);
        a.c = canonize(ctx, a.c);
    }
    return a;
}

