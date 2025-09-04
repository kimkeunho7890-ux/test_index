const express = require('express');
const multer = require('multer');
const path = require('path');
const Papa = require('papaparse');
const iconv = require('iconv-lite');

const app = express();
const port = 3000;

let cachedData = [];

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));

app.post('/upload', upload.single('csvfile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('파일이 업로드되지 않았습니다.');
    }

    // ✨✨✨ 가장 중요한 수정 부분! ✨✨✨
    // 파일을 UTF-8 형식으로 먼저 변환합니다. 대부분의 최신 CSV 파일은 이 형식입니다.
    const fileContent = req.file.buffer.toString('utf8');
    
    Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                cachedData = results.data;
                console.log(`새로운 데이터 ${cachedData.length}개를 메모리에 저장했습니다.`);
                res.send('파일 업로드 및 데이터 변환 성공! <a href="/">조회 페이지로 가기</a>');
            } else {
                console.error('CSV 파싱 후 데이터가 비어있습니다. 파일 내용을 확인해주세요.', results.errors);
                res.status(400).send('CSV 파일을 처리했지만 데이터가 없습니다. 파일의 내용이나 형식을 확인해주세요. <a href="/admin.html">돌아가기</a>');
            }
        },
        error: function(err) {
            console.error('CSV 파싱 오류:', err);
            res.status(500).send('CSV 파싱 중 심각한 오류가 발생했습니다.');
        }
    });
});

app.get('/api/data', (req, res) => {
    res.json(cachedData);
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});