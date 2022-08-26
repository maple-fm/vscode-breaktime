// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { countReset } from 'console';
import * as typescript from 'typescript';
import * as vscode from 'vscode';
import * as path from 'path';
import count = require('./count/count'); // count.tsにある文字数カウントクラスなどをインポート
import globalData = require("./count/controlData");

const MINITES = 0; // m
const SECONDS = 30; // s
const INTERVAL = 30000; // ms : 30秒


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-breaktime" is now active!');

	let charCount = new count.CharCount();
	let countEventCont = new count.CountEventController(charCount);

	let data = new globalData.Data(context);
	

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let disposable = vscode.commands.registerCommand('vscode-breaktime.helloWorld', () => {

		// The code you place here will be executed every time your command is executed
		// Display a message box to the user

		setTimeout(startbreak, INTERVAL, context, data, charCount);


	});


	context.subscriptions.push(disposable);


	// リソース解放
	//context.subscriptions.push(disposable);
	context.subscriptions.push(countEventCont);

}

// this method is called when your extension is deactivated
export function deactivate() {

}



/*
*タイマーをセットする
*/
function startbreak(context: vscode.ExtensionContext, input: globalData.Data, content: count.CharCount){
	vscode.window.showInformationMessage('休憩してください！', {
		modal: true,
	});

	input.dataInput(content); // データをglobalStorageに格納する
	

	const kyuukeiFigures = {'休憩': 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEibNNjxJIu-0NU_bkVjslf6-CN7u6VGUUQsst4_-_PhGbaASpwuoDsF6fvtliWir7rfrB45XGZHdEbVCAp1utUWG7dhfWDp2-DG_r3-s0agCs5srD2qqRjaQdYXYE-iBd2BGloB_J62bjZYJ0pGdIAQsyMMNTCbJtaqVeUYtwfxB1SmxoNB-qQMQSGp/s1000/11792.gif'};

	function getWebviewContent(kyuukeiResult: keyof typeof kyuukeiFigures) {
		return `<!DOCTYPE html>
		<html lang="ja">
		<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body>
		<img src="${kyuukeiFigures[kyuukeiResult]}" />
		</body>
		</html>`;
	}
	const kyuukeiCandidates = ['休憩'] as const;
	const kyuukeiResult = kyuukeiCandidates[Math.floor(Math.random() * kyuukeiCandidates.length)];
	const panel = vscode.window.createWebviewPanel('breaktime',`お疲れ様です。${kyuukeiResult}のお時間です！`,vscode.ViewColumn.One,{});
	panel.webview.html = getWebviewContent(kyuukeiResult);

	// webviewはローカルリソースに直接アクセスできないらしい
	// 読み込みたいときはWebview.asWebviewUri関数を使って、読み込める形に変換しないといけない
	// https://code.visualstudio.com/api/extension-guides/webview#loading-local-content
	// Create and show a new webview
	const panell = vscode.window.createWebviewPanel(
		'Graph', // Identifies the type of the webview. Used internally
		'test area', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{enableScripts: true} // Webview options. More on these later.
	);

	const graphPath = vscode.Uri.file(
		path.join(context.extensionPath, 'src', 'graph.js')
	);
	const graphSrc = panell.webview.asWebviewUri(graphPath);

	panell.webview.html = getWebviewContents(graphSrc);



	timer(MINITES,SECONDS, context, input, content);// 分：秒
}

/*
*タイマー開始
*/
function timer(min: number, sec: number, context: vscode.ExtensionContext, input: globalData.Data, content: count.CharCount){

	if(sec - 1 === -1){
		min --;
		sec = 59;
	}
	else{
		sec --;
	}
	//console.log(min, sec);
	// vscode.window.showInformationMessage("残り"+min+ "分"+sec+"秒です!");
	vscode.window.setStatusBarMessage("残り"+min+ "分"+sec+"秒です!", min*60000+sec*1000);
	var id = setTimeout(timer, 1000, min, sec, context, input, content);
	// var id = setInterval(timer, 2000, min, sec);

	// 終了
	if(min < 0 ){
		clearTimeout(id);
		vscode.window.showInformationMessage('休憩終了です！', {
			modal: true,
		});
		setTimeout(startbreak, INTERVAL, context, input, content);
	}

}

function getWebviewContents(graphSrc: vscode.Uri){
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>title</title>
	</head>
	<body>
		<h1>title</h1>

		<div class=""><input type="radio" name="analysis" value="bar" checked>縦棒グラフ</div>
		<div class=""><input type="radio" name="analysis" value="Line">折れ線グラフ</div>
		<div class=""><input type="radio" name="analysis" value="3">散布図</div>

		<div>
			<canvas id="graph" width="100%"></canvas>
		</div>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.8.0/Chart.js"></script>
		<script src=` + graphSrc + `></script>
	</body>
	</html>
	`;
}
