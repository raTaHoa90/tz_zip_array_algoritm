
function generateArray(){
    let textarea = document.getElementById("arrayconfig"),
        countValues = +document.getElementById("countValues").value,
        maxValue = +document.getElementById("maxValue").value,
        ar = Array(countValues).fill().map(()=>Math.floor(Math.random() * (maxValue > 1 ? maxValue : 2) + (maxValue > 1 ? 1 : 0)));
    textarea.value = '['+ ar.join(',') +']';
    document.getElementById("sizeStrArr").textContent = textarea.value.length;
    document.getElementById("sizeBits").textContent = calcCountBits(Math.max(...ar));
}

function calcLenArray(){
    let sizeStrArr = document.getElementById("sizeStrArr"),
        textarea = document.getElementById("arrayconfig");
    sizeStrArr.textContent = textarea.value.length;
    try {
        document.getElementById("sizeBits").textContent = calcCountBits(Math.max(...eval(textarea.value)));
    }catch{}
}

function SerializeArray(){
    let textarea = document.getElementById("arrayconfig"),
        sizeBits = +document.getElementById("sizeBits").textContent,
        fullSize = document.getElementById("sizeStrArr").textContent,
        result = ZipArray(eval(textarea.value), sizeBits);
    document.getElementById('result').value = result;
    document.getElementById("sizeResultStr").textContent = '' + result.length + ' (' + (result.length / fullSize * 100).toFixed(2) + '%)';
}

function UnserializeArray(){
    let textarea = document.getElementById("result"),
        sizeBits = +document.getElementById("sizeBits").textContent,
        result = UnZipArray(textarea.value, sizeBits);
    document.getElementById('resultUnzip').value = '[' + result.join(',') + ']';
}

/****************************************/

function calcCountBits(num){
    let max = 1;
    for(let i = 1; i <= 64 && num > 0; i++, num >>= 1)
        if(num & 1)
            max = i;
    return max;
}

/****************************************/

class ByteZipper {
    #value;
    #bitsV;
    #bitsR;
    #pos;
    #start;
    constructor(bitsValue, bitsResult = 7){
        this.#pos = 0;
        this.#value = 0;
        this.#bitsV = bitsValue;
        this.#bitsR = bitsResult;
        this.#start = true;
    }

    get pos(){ return this.#pos}
    set pos(v) { this.#pos = v}

    valOfBit(bits){
        return (1 << bits) - 1;
    }

    pushBits(value){
        if(this.#pos == 0)
            this.#value = value;
        else
            this.#value |= value << this.#pos;
        this.#pos += this.#bitsV;
    }

    hasResultFull(){
        return this.#pos >= this.#bitsR;
    }

    popResult(){
        this.#pos -= this.#bitsR;
        let result = this.#value & this.valOfBit(this.#bitsR)
        this.#value >>= this.#bitsR;
        return result;
    }

    /************/

    pushResult(byte){
        this.#value <<= this.#bitsR;
        this.#value |= byte;
        if(!this.#start)
            this.#pos += this.#bitsR;
        this.#start = false;
    }

    hasOriginFull(){
        return this.#pos >= this.#bitsV;
    }

    popBits(){
        this.#pos -= this.#bitsV;
        let result = this.#value >> this.#pos;
        this.#value &= this.valOfBit( this.#pos );
        return result;
    }

}


function ZipArray(arr){
    let bits = calcCountBits(Math.max(...arr)),
        countBits = arr.length * bits,
        countBytes = Math.ceil(countBits / 7) + 2, // 7 из 8 бит, что бы не выйти за границы базовой таблицы ASCII (127 символов)
        buffer = new ArrayBuffer(countBytes),
        bufferByte = new Uint8Array(buffer),
        zipper = new ByteZipper(bits),
        posBuffer = 2;
    bufferByte[0] = bits;

    for(let value of arr){
        zipper.pushBits(value);
        while(zipper.hasResultFull()){
            bufferByte[posBuffer] = zipper.popResult();
            posBuffer++;
        }
    }
    bufferByte[1] = zipper.pos;
    bufferByte[posBuffer] = zipper.popResult();
    
    let result = [];
    for(let byte of bufferByte)
        if(byte <= 33)
            result.push( '!\\x' + (34 + byte).toString(16).padStart(2,'0') );
        else if(byte == 127)
            result.push('!~');
        else 
            result.push('\\x' + byte.toString(16).padStart(2,'0'));

    return eval("'"+result.join('') + "'");
}

function replacesUnZipAnchers(m, p){
    if(p == '!~')
        return '\x7F';
    return eval('"\\x' + (p.charCodeAt(1) - 34).toString(16).padStart(2,'0')+'"');
}

function UnZipArray(str){
    let resultArray = [],
        bufferChar = str.replace(/(\!.)/g, replacesUnZipAnchers).split(''),
        bits = bufferChar.shift().charCodeAt(0),
        zipper = new ByteZipper(bits);
    zipper.pos = bufferChar.shift().charCodeAt(0);

    for(let char of bufferChar.reverse()){

        zipper.pushResult(char.charCodeAt());
        while(zipper.hasOriginFull())
            resultArray.push(zipper.popBits());
    }
    return resultArray.reverse();
}