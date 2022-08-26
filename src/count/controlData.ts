import * as fs from 'fs';
import * as vscode from 'vscode';
import count = require('./count'); // count.tsにある文字数カウントクラスなどをインポート
const date = new Date().toLocaleString('sv').replace(/\D/g, ''); // スウェーデン語のフォーマットYYYY-MM-DD HH:MM:SSをreplaceにてYYYYMMDDHHMMSSに置き換え

/**
 * 所得したデータを扱うクラス
 */
export class Data{

    private static _context : vscode.ExtensionContext;
    private static _inputFileName : string[]; // globalStorageへファイル名の書き込みをするときに必要なファイル名をまとめたフィールド
    private static _buffer:Buffer; // globalStorage から取り出したデータをまとめて一時的に格納するフィールド
    private static _timestamp: Array<number> = []; // タイムスタンプ
    private static _outputFileName: Array<string> = []; // ファイル名
    private static _strNum: Array<number> = []; // 文字数

    private _dataBeforeConvert: string = "none"; // 変換前の取り出したデータ
    private _mixtureData: Array<string> = []; // _dataBeforeConvertをsplitした後の情報が混じったデータ

    /**
     * コンストラクタ: 引数のExtensionContextをこのクラスに代入する
     * @param {vscode.ExtensionContext} context 
     */
    constructor(context: vscode.ExtensionContext){
		Data._context = context; // 引数のExtensionContextを格納
	}

    /**
     * 文字数などのデータをglobalStorageに書き込むメソッド
     * @param {count.CharCount} contents ファイル名や文字数などが格納されたフィールド
     * @param {number} mode 書き込みのモード(0(デフォルト):現在のデータから1か月間のデータを書き込む, 1:データをすべて消去して新しく書き込む)
     */
    public dataInput(contents:count.CharCount, mode: number = 0) : void{
        Data._inputFileName = contents.returnFileName(); // まとめてファイル名を受け取る

        let temp = new Date(); // 現在の時刻を所得
        let timestamp = temp.getTime(); // タイムスタンプに変換

        let joy = true; // 書き込み用のもの

        this.dataOutput();

        for(let i= 0; i < Data._outputFileName.length && mode === 0; i++){
            // globalStorageに保存する文字列の作成
            let input:string = Data._timestamp[i].toString() // タイムスタンプ(ミリ秒まで, 13桁)
                                + "?" // 区切り文字
                                + Data._outputFileName[i] // ファイル名
                                + "?" // ファイル名と文字数の境目をわかりやすくする
                                + Data._strNum[i].toString() // 文字数
                                + "?" // 区切り文字
                                + "\n" // 改行
                                + "?"
                                ;
            
            if(this.judgeTimeForMonth(Data._timestamp[i]) && joy && i !== 0){
                fs.appendFileSync(Data._context.globalStorageUri.fsPath, input);
            }
            else if(this.judgeTimeForMonth(Data._timestamp[i]) && !joy ){
                fs.writeFileSync(Data._context.globalStorageUri.fsPath, input);
                joy = true;
            }
            else{
                joy = false;
            }
        }
        

        for(let i = 0; i < Data._inputFileName.length; i++){
            // globalStorageに保存する文字列の作成
            let input:string = timestamp.toString() // タイムスタンプ(ミリ秒まで, 13桁)
                                + "?" // 区切り文字
                                + Data._inputFileName[i] // ファイル名
                                + "?" // ファイル名と文字数の境目をわかりやすくする
                                + contents.returnStrNum(Data._inputFileName[i]).toString() // 文字数
                                + "?" // 区切り文字
                                + "\n" // 改行
                                + "?"
                                ;
            
            switch(mode){
                case 0:
                    fs.appendFileSync(Data._context.globalStorageUri.fsPath, input); // 追加書き込み
                    break;

                case 1:
                    if(i === 0){
                        fs.writeFileSync(Data._context.globalStorageUri.fsPath, input); // ファイルを上書き(リセットしてから書き込み)
                    }
                    else{
                        fs.appendFileSync(Data._context.globalStorageUri.fsPath, input); // 追加書き込み
                    }

                    break;
            }

            //fs.appendFileSync(Data._context.globalStorageUri.fsPath, output); // ファイルに追加書き込みする
            console.log(input);
        } // 000000000?undefined-1?234?\n?

        
    }
    
    /**
     * データを取り出すメソッド
     */
    public dataOutput(){
        Data._buffer = fs.readFileSync(Data._context.globalStorageUri.fsPath); // globalStorage内のデータすべてを取り出す
        //console.log(Buffer.from(Data._buffer).toString());

        // 読み込んだデータを扱いやすい型で分けて格納する
        this._dataConvert();

        for(let i = 0; i < Data._outputFileName.length; i++){
            //console.log("file name: " + Data._outputFileName[i] + " num of string:" + Data._strNum[i] + " stamp:" + Data._timestamp[i]);
        }
    }

    /**
     * 読み込んだデータを変換するメソッド
     */
    private _dataConvert(): void{
        this._dataBeforeConvert = Buffer.from(Data._buffer).toString(); // String型に変換したバッファのデータを格納

        this._mixtureData = this._dataBeforeConvert.split("?");
        //console.log("dou :" + this._mixtureData[3] + "fow:" + this._mixtureData[4]);

        for(let i = 0; 4 * i < this._mixtureData.length - 1; i++){
            Data._timestamp[i] = parseInt(this._mixtureData[4 * i]);
            Data._outputFileName[i] = this._mixtureData[4 * i + 1];
            Data._strNum[i] = parseInt(this._mixtureData[4 * i + 2]);
        }
    }

    /**
     * タイムスタンプが現在からmonthカ月内のものであるか返すメソッド
     * @param timeStamp 判断したいタイムスタンプ
     * @param month 範囲となる月
     * @returns タイムスタンプはmonthの範囲内か
     */
    public judgeTimeForMonth(timeStamp: number, month: number = 1): boolean{
        let date = new Date(timeStamp); // timeStampから日付を所得
        let monthDateFromNow = new Date(); // 現在の日付を所得
        monthDateFromNow.setDate(monthDateFromNow.getDate() - (month * 30)); // 現在の日付から30*month日前の日付に変更

        let judgement: boolean = true; // 返り値用
        
        if(monthDateFromNow.getTime() <= date.getTime()){ // 30*month日以内前である時
            judgement = true;
        }
        else{
            judgement = false;
        }

        console.log(timeStamp + " judge:" + judgement);
        
        return judgement;
    }

    /**
     * タイムスタンプを配列で返すメソッド
     * @returns {number[]} タイムスタンプ
     */
    public returnTimeStamp(): number[]{
        return Data._timestamp;
    }

    /**
     * globalStorage内のファイル名を返すメソッド
     * @returns {string[]} ファイル名
     */
    public returnOutputFileName(): string[]{
        return Data._outputFileName;
    }

    /**
     * globalStorage内に保存されている文字数を返すメソッド
     * @returns {number[]} 各ファイルごとの文字数
     */
    public returnNumOfString(): number[]{
        return Data._strNum;
    }
}

