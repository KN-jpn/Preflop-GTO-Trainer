// カードの強さの順位（Aが一番強く、2が一番弱い）
const cardRanks = "23456789TJQKA";

// ----------------------------------------------------
// 【完全データ駆動版】提供いただいたチャートに基づくGTOレンジ
// ----------------------------------------------------
const gtoRanges = {
    "UTG_open": {
        pairs: "55+",
        suitedAxs: "A2s+",
        suitedBroadways: "K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s",
        offsuitBroadways: "AJo+, KQo+"
    },
    "HJ_open": {
        pairs: "22+",
        suitedAxs: "A2s+",
        suitedBroadways: "K7s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s",
        offsuitBroadways: "ATo+, KJo+, QJo"
    },
    "CO_open": {
        pairs: "22+",
        suitedAxs: "A2s+",
        suitedBroadways: "K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 65s, 54s",
        offsuitBroadways: "ATo+, KTo+, QTo+, JTo"
    },
    "BTN_open": {
        pairs: "22+",
        suitedAxs: "A2s+",
        suitedBroadways: "K2s+, Q2s+, J4s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s",
        offsuitBroadways: "A2o+, K9o+, Q9o+, J9o+, T8o+, 98o, 87o"
    },
    "SB_open": {
        pairs: "22+",
        suitedAxs: "A2s+",
        suitedBroadways: "K2s+, Q2s+, J2s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s",
        offsuitBroadways: "A2o+, K5o+, Q8o+, J8o+, T8o+, 98o"
    },
    "BB_vs_BTN_raise": {
        // 3ベット（レイズ）で返すレンジ
        raise: {
            pairs: "TT+",
            suitedAxs: "A2s-A5s, ATs+",
            suitedBroadways: "KTs+, QTs+, JTs",
            offsuitBroadways: "AQo+"
        },
        // コールでディフェンスするレンジ
        call: {
            pairs: "22-99",
            suitedAxs: "A6s-A9s",
            suitedBroadways: "K2s-K9s, Q2s-Q9s, J2s-J9s, T2s+, 95s+, 84s+, 74s+, 63s+, 53s+, 43s",
            offsuitBroadways: "A2o-AJo, KTo+, QTo+, JTo, T9o, 98o, 87o"
        }
    }
};

// 出題シチュエーション
const situations = [
    { id: "UTG_open", title: "全員フォールド", pos: "UTG (アンダーザガン)", note: "最初の参加者です。非常にタイトなレンジが求められます。" },
    { id: "HJ_open", title: "全員フォールド", pos: "HJ (ハイジャック)", note: "UTGがフォールドし、あなたの番です。" },
    { id: "CO_open", title: "全員フォールド", pos: "CO (カットオフ)", note: "前のプレイヤーは全員フォールドしました。" },
    { id: "BTN_open", title: "全員フォールド", pos: "BTN (ボタン)", note: "ボタンポジションです。かなり広いレンジでオープンできます。" },
    { id: "SB_open", title: "全員フォールド", pos: "SB (スモールブラインド)", note: "ボタンまで全員フォールド。BBのみを相手にする状況です。" },
    { id: "BB_vs_BTN_raise", title: "BTNが2.5bbにレイズした", pos: "BB (ビッグブラインド)", note: "BTNからのルースなレイズに対し、守る(Call)か、3ベット(Raise)するか選んでください。" }
];

let currentHand = "";
let currentSitIdx = 0;
let currentCorrectAction = "";
let currentExplanation = "";
let score = 0;
let total = 0;

window.onload = function() {
    generateRandomQuiz();
};

// クイズをランダム生成するメインロジック
function generateRandomQuiz() {
    document.getElementById("result-container").classList.add("hidden");

    // 1. 状況をランダムに決定
    currentSitIdx = Math.floor(Math.random() * situations.length);
    const sit = situations[currentSitIdx];

    // 2. 手札をランダムに決定 (169通り)
    const rank1Idx = Math.floor(Math.random() * 13);
    const rank2Idx = Math.floor(Math.random() * 13);
    const r1 = cardRanks[Math.max(rank1Idx, rank2Idx)];
    const r2 = cardRanks[Math.min(rank1Idx, rank2Idx)];
    
    if (r1 === r2) {
        currentHand = r1 + r2;
    } else {
        currentHand = r1 + r2 + (Math.random() < 0.25 ? "s" : "o");
    }

    // 3. GTOデータに基づいて正解をロジック判定
    determineCorrectAction(sit.id, r1, r2, currentHand);

    // 4. 画面書き換え
    document.getElementById("hand").innerText = currentHand;
    document.getElementById("situation").innerText = sit.title;
    document.getElementById("position").innerText = sit.pos;
}

// ユーザーの手札が、指定されたレンジ文字列（例: "77+", "A2s-A5s"）に含まれるか判定する関数
function isHandInRange(r1, r2, hand, rangeStr) {
    if (!rangeStr) return false;
    const tokens = rangeStr.split(", ");
    
    for (let token of tokens) {
        // ① "+" 形式の判定 (例: 77+, A2s+)
        if (token.endsWith("+")) {
            const base = token.slice(0, -1);
            if (hand.length === 2 && base.length === 2) { // ペア (77+)
                if (cardRanks.indexOf(r1) >= cardRanks.indexOf(base[0])) return true;
            } else if (hand.endsWith("s") && base.endsWith("s")) { // スーテッド (A2s+)
                if (base[0] === r1 && cardRanks.indexOf(r2) >= cardRanks.indexOf(base[1])) return true;
                if (base[0] === "T" && cardRanks.indexOf(r1) >= cardRanks.indexOf("T") && cardRanks.indexOf(r2) >= cardRanks.indexOf(base[1])) return true;
            } else if (hand.endsWith("o") && base.endsWith("o")) { // オフスーテッド (ATo+)
                if (base[0] === r1 && cardRanks.indexOf(r2) >= cardRanks.indexOf(base[1])) return true;
            }
        }
        // ② "-" 形式（範囲指定）の判定 (例: 22-88, A2s-A5s)
        else if (token.includes("-")) {
            const [start, end] = token.split("-");
            const idx1 = cardRanks.indexOf(r1);
            const idx2 = cardRanks.indexOf(r2);
            if (hand.length === 2) { // ペア
                if (idx1 >= cardRanks.indexOf(start[0]) && idx1 <= cardRanks.indexOf(end[0])) return true;
            } else if (hand.endsWith("s")) { // スーテッド
                if (r1 === start[0] && idx2 >= cardRanks.indexOf(start[1]) && idx2 <= cardRanks.indexOf(end[1])) return true;
            } else if (hand.endsWith("o")) { // オフスーテッド
                if (r1 === start[0] && idx2 >= cardRanks.indexOf(start[1]) && idx2 <= cardRanks.indexOf(end[1])) return true;
            }
        }
        // ③ ピンポイント指定の判定 (例: "JTs", "98o")
        else {
            if (hand === token) return true;
        }
    }
    return false;
}

// 状況と手札から正解を割り出す関数
function determineCorrectAction(sitId, r1, r2, hand) {
    const range = gtoRanges[sitId];
    
    // 対レイズ（BB_vs_BTN_raise）の場合の判定
    if (sitId === "BB_vs_BTN_raise") {
        if (isHandInRange(r1, r2, hand, range.raise.pairs) || 
            isHandInRange(r1, r2, hand, range.raise.suitedAxs) || 
            isHandInRange(r1, r2, hand, range.raise.suitedBroadways) || 
            isHandInRange(r1, r2, hand, range.raise.offsuitBroadways)) {
            currentCorrectAction = "Raise";
            currentExplanation = `${hand}は非常に強力、またはブラフに適したハンドです。BTNのレイズに対してさらに「Raise（3ベット）」を返して主導権を奪い返します。`;
        } else if (isHandInRange(r1, r2, hand, range.call.pairs) || 
                   isHandInRange(r1, r2, hand, range.call.suitedAxs) || 
                   isHandInRange(r1, r2, hand, range.call.suitedBroadways) || 
                   isHandInRange(r1, r2, hand, range.call.offsuitBroadways)) {
            currentCorrectAction = "Call";
            currentExplanation = `${hand}は、すでにチップを支払っているBB（ビッグブラインド）の割引価格を活かして「Call」し、フロップ（次のラウンド）を見に行くのがGTO上最適です。`;
        } else {
            currentCorrectAction = "Fold";
            currentExplanation = `${hand}は、BTNのレイズに対して戦うには弱すぎます。無駄なチップを支払わずに「Fold」するのが正解です。`;
        }
        return;
    }

    // 全員フォールド（オープン）の場合の判定
    if (isHandInRange(r1, r2, hand, range.pairs) || 
        isHandInRange(r1, r2, hand, range.suitedAxs) || 
        isHandInRange(r1, r2, hand, range.suitedBroadways) || 
        isHandInRange(r1, r2, hand, range.offsuitBroadways)) {
        currentCorrectAction = "Raise";
        currentExplanation = `${hand}は、このポジションのGTOオープンレンジ（参加基準）に入っています。ポーカーでは参加するときはコールではなく「Raise」で主導権を握るのが基本です。`;
    } else {
        currentCorrectAction = "Fold";
        currentExplanation = `${hand}はこのポジションから参加するには強さが足りません。GTO（理論上最適な戦術）では、迷わず「Fold」を選択します。`;
    }
}

// ボタンが押されたときの正誤判定
function checkAnswer(userChoice) {
    if (!document.getElementById("result-container").classList.contains("hidden")) return;

    const resultText = document.getElementById("result-text");
    const explanationText = document.getElementById("explanation-text");
    
    total++;

    if (userChoice === currentCorrectAction) {
        score++;
        resultText.innerText = "⭕ 正解！";
        resultText.className = "result-text correct";
    } else {
        resultText.innerText = `❌ 不正解（正解: ${currentCorrectAction}）`;
        resultText.className = "result-text incorrect";
    }

    explanationText.innerText = currentExplanation;
    
    document.getElementById("score").innerText = score;
    document.getElementById("total").innerText = total;
    document.getElementById("result-container").classList.remove("hidden");
}

function nextQuestion() {
    generateRandomQuiz();
}