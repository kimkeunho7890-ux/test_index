// 전역 변수로 데이터 저장하기
let allData = [];
const ITEMS_PER_PAGE = 10;
let currentManagerStoreList = [];
let currentSortCriteria = '합계';
let currentSortOrder = 'desc';
let currentFilterColumn = '모델명';
let currentFilterValue = '';
let groupSortOrder = 'asc';
let debounceTimer;
let detailSortCriteria = '개통일';
let detailSortOrder = 'desc';
let currentlyDisplayedData = [];
let globalSortCriteria = '개통일'; // 기본 정렬 기준
let globalSortOrder = 'desc';   // 기본 정렬 순서 (최신순)
let currentSearchResults = []; // 현재 검색 결과를 저장할 변수

// 페이지가 로드되면 서버에서 데이터를 가져오는 함수를 바로 실행합니다.
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.getElementById('global-search-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            performGlobalSearch();
        }
    });
});

// ✨✨✨ 변경점: 관리자 비밀번호 확인 함수 추가 ✨✨✨
function promptForAdminPassword() {
    const password = prompt("관리자 비밀번호를 입력하세요:");
    if (password === "2178149594") {
        // 비밀번호가 맞으면, 브라우저의 임시 저장소에 '인증됨' 표시를 남깁니다.
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        // 인증 성공 후 데이터를 다시 로드하여 모든 정보를 보여줍니다.
        fetchData();
        alert("관리자 인증이 완료되었습니다.");
    } else {
        alert("비밀번호가 틀렸습니다.");
    }
}

// ✨✨✨ 변경점: 관리자 인증 상태 확인 함수 추가 ✨✨✨
function isAdminAuthenticated() {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
}


function fetchData() {
    Papa.parse('salesindex.csv', {
        download: true,
        header: true,
        complete: function(results) {
            allData = results.data.map(row => {
                // '개통번호'와 '고객명'을 관리자만 볼 수 있도록 처리
                if (!isAdminAuthenticated()) {
                    if (row['개통번호']) {
                        let num = row['개통번호'].split('-').join('');
                        row['개통번호'] = `010-****-${num.substring(num.length - 4)}`;
                    }
                    if (row['고객명']) {
                        row['고객명'] = row['고객명'].substring(0, 1) + "**";
                    }
                }
                return row;
            });
            currentlyDisplayedData = allData; // 처음에는 모든 데이터를 보여줍니다.
            const managerData = processData(allData);
            renderManagerTable(managerData);
        }
    });
}


// 담당자별 실적 데이터를 계산하는 함수
function processData(data) {
    const groupedByManager = data.reduce((acc, row) => {
        const manager = row['담당'];
        if (!acc[manager]) {
            acc[manager] = {
                '담당': manager,
                '신규': 0, 'MNP': 0, '기변': 0, '2nd': 0, '합계': 0,
                '유플레이': 0, 'V컬러링음악감상': 0, '폰교체패스': 0, '안심패스': 0,
                'VAS': 0, 'VAS모수': 0, '고가치(95)': 0, '고가치мо수': 0,
                '당유': 0,
                '신모델': 0, // ✨ 신모델 항목 추가
                '접수코드불일치': 0,
                'storeList': {}
            };
        }
        acc[manager]['신규'] += parseInt(row['신규'] || 0);
        acc[manager]['MNP'] += parseInt(row['MNP'] || 0);
        acc[manager]['기변'] += parseInt(row['기변'] || 0);
        acc[manager]['2nd'] += parseInt(row['2nd'] || 0);
        acc[manager]['합계'] += parseInt(row['합계'] || 0);
        acc[manager]['유플레이'] += parseFloat(row['유플레이'] || 0);
        acc[manager]['V컬러링음악감상'] += parseFloat(row['V컬러링음악감상'] || 0);
        acc[manager]['폰교체패스'] += parseFloat(row['폰교체패스'] || 0);
        acc[manager]['안심패스'] += parseFloat(row['안심패스'] || 0);
        acc[manager]['VAS'] += parseFloat(row['VAS'] || 0);
        acc[manager]['VAS모수'] += parseInt(row['VAS모수'] || 0);
        acc[manager]['고가치(95)'] += parseInt(row['고가치(95)'] || 0);
        acc[manager]['고가치모수'] += parseInt(row['고가치모수'] || 0);
        acc[manager]['당유'] += row['당유'] === '대상' ? 1 : 0;
        acc[manager]['신모델'] += parseInt(row['신모델'] || 0); // ✨ 신모델 합계 계산
        acc[manager]['접수코드불일치'] += row['접수코드불일치'] === 'TRUE' ? 1 : 0;

        const storeName = row['판매점명'];
        if (!acc[manager].storeList[storeName]) {
            acc[manager].storeList[storeName] = [];
        }
        acc[manager].storeList[storeName].push(row);

        return acc;
    }, {});

    return Object.values(groupedByManager).map(manager => {
        manager['VAS(%)'] = manager['VAS모수'] > 0 ? (manager['VAS'] / manager['VAS모수']) * 100 : 0;
        manager['고가치(%)'] = manager['고가치모수'] > 0 ? (manager['고가치(95)'] / manager['고가치모수']) * 100 : 0;
        manager['당유(%)'] = manager['VAS모수'] > 0 ? (manager['당유'] / manager['VAS모수']) * 100 : 0;
        return manager;
    });
}


// 담당자별 실적 테이블을 화면에 그리는 함수
function renderManagerTable(managerData) {
    const container = document.getElementById('manager-table');
    let total = {
        '신규': 0, 'MNP': 0, '기변': 0, '2nd': 0, '합계': 0,
        '유플레이': 0, 'V컬러링음악감상': 0, '폰교체패스': 0, '안심패스': 0,
        'VAS': 0, 'VAS모수': 0, '고가치(95)': 0, '고가치мо수': 0,
        '당유': 0, '신모델': 0, '접수코드불일치': 0
    };
    managerData.forEach(data => {
        for (let key in total) {
            total[key] += data[key] || 0;
        }
    });

    let table = `
        <div class="table-container">
        <table>
            <tr>
                <th class="sortable" onclick="setSortCriteria('담당')">담당 ${getSortArrow('담당')}</th>
                <th class="sortable" onclick="setSortCriteria('신규')">신규 ${getSortArrow('신규')}</th>
                <th class="sortable" onclick="setSortCriteria('MNP')">MNP ${getSortArrow('MNP')}</th>
                <th class="sortable" onclick="setSortCriteria('기변')">기변 ${getSortArrow('기변')}</th>
                <th class="sortable" onclick="setSortCriteria('2nd')">2nd ${getSortArrow('2nd')}</th>
                <th class="sortable" onclick="setSortCriteria('합계')">합계 ${getSortArrow('합계')}</th>
                <th class="sortable" onclick="setSortCriteria('유플레이')">유플레이 ${getSortArrow('유플레이')}</th>
                <th class="sortable" onclick="setSortCriteria('V컬러링음악감상')">V컬러링 ${getSortArrow('V컬러링음악감상')}</th>
                <th class="sortable" onclick="setSortCriteria('폰교체패스')">폰교체패스 ${getSortArrow('폰교체패스')}</th>
                <th class="sortable" onclick="setSortCriteria('안심패스')">안심패스 ${getSortArrow('안심패스')}</th>
                <th class="sortable" onclick="setSortCriteria('VAS(%)')">VAS(%) ${getSortArrow('VAS(%)')}</th>
                <th class="sortable" onclick="setSortCriteria('고가치(%)')">고가치(%) ${getSortArrow('고가치(%)')}</th>
                <th class="sortable" onclick="setSortCriteria('당유(%)')">당유(%) ${getSortArrow('당유(%)')}</th>
                <th class="sortable" onclick="setSortCriteria('신모델')">신모델 ${getSortArrow('신모델')}</th>
                <th class="sortable" onclick="setSortCriteria('접수코드불일치')">접수코드불일치 ${getSortArrow('접수코드불일치')}</th>
            </tr>
    `;

    // 데이터 정렬
    managerData.sort((a, b) => {
        let valA, valB;
        switch (currentSortCriteria) {
            case '담당': valA = a['담당']; valB = b['담당']; break;
            case '신규': valA = a['신규']; valB = b['신규']; break;
            case 'MNP': valA = a['MNP']; valB = b['MNP']; break;
            case '기변': valA = a['기변']; valB = b['기변']; break;
            case '2nd': valA = a['2nd']; valB = b['2nd']; break;
            case '합계': valA = a['합계']; valB = b['합계']; break;
            case '유플레이': valA = a['유플레이']; valB = b['유플레이']; break;
            case 'V컬러링음악감상': valA = a['V컬러링음악감상']; valB = b['V컬러링음악감상']; break;
            case '폰교체패스': valA = a['폰교체패스']; valB = b['폰교체패스']; break;
            case '안심패스': valA = a['안심패스']; valB = b['안심패스']; break;
            case 'VAS(%)': valA = a['VAS(%)']; valB = b['VAS(%)']; break;
            case '고가치(%)': valA = a['고가치(%)']; valB = b['고가치(%)']; break;
            case '당유(%)': valA = a['당유(%)']; valB = b['당유(%)']; break;
            case '신모델': valA = a['신모델']; valB = b['신모델']; break; // ✨ 신모델 정렬
            case '접수코드불일치': valA = a['접수코드불일치']; valB = b['접수코드불일치']; break;
            default: valA = a['합계']; valB = b['합계'];
        }

        if (typeof valA === 'string') {
            return currentSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return currentSortOrder === 'asc' ? valA - valB : valB - valA;
        }
    });

    managerData.forEach(row => {
        table += `
            <tr onclick="showStoreDetails('${row['담당']}')">
                <td>${row['담당']}</td>
                <td>${row['신규']}</td>
                <td>${row['MNP']}</td>
                <td>${row['기변']}</td>
                <td>${row['2nd']}</td>
                <td>${row['합계']}</td>
                <td>${row['유플레이']}</td>
                <td>${row['V컬러링음악감상']}</td>
                <td>${row['폰교체패스']}</td>
                <td>${row['안심패스']}</td>
                <td>${(row['VAS(%)']).toFixed(1)}%</td>
                <td>${(row['고가치(%)']).toFixed(1)}%</td>
                <td>${(row['당유(%)']).toFixed(1)}%</td>
                <td>${row['신모델']}</td>
                <td>${row['접수코드불일치']}</td>
            </tr>
        `;
    });

    const totalVasPercent = total['VAS모수'] > 0 ? (total['VAS'] / total['VAS모수']) * 100 : 0;
    const totalGogachiPercent = total['고가치모수'] > 0 ? (total['고가치(95)'] / total['고가치모수']) * 100 : 0;
    const totalDangyouPercent = total['VAS모수'] > 0 ? (total['당유'] / total['VAS모수']) * 100 : 0;

    table += `
        <tr class="total-row">
            <td>합계</td>
            <td>${total['신규']}</td>
            <td>${total['MNP']}</td>
            <td>${total['기변']}</td>
            <td>${total['2nd']}</td>
            <td>${total['합계']}</td>
            <td>${total['유플레이']}</td>
            <td>${total['V컬러링음악감상']}</td>
            <td>${total['폰교체패스']}</td>
            <td>${total['안심패스']}</td>
            <td>${totalVasPercent.toFixed(1)}%</td>
            <td>${totalGogachiPercent.toFixed(1)}%</td>
            <td>${totalDangyouPercent.toFixed(1)}%</td>
            <td>${total['신모델']}</td>
            <td>${total['접수코드불일치']}</td>
        </tr>
    </table></div>`;

    container.innerHTML = table;
}


// 정렬 기준을 설정하는 함수
function setSortCriteria(criteria) {
    if (currentSortCriteria === criteria) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortCriteria = criteria;
        currentSortOrder = (criteria === '담당') ? 'asc' : 'desc';
    }
    const managerData = processData(currentlyDisplayedData);
    renderManagerTable(managerData);
}

// 정렬 방향을 화살표로 표시하는 함수
function getSortArrow(criteria) {
    if (currentSortCriteria === criteria) {
        return currentSortOrder === 'asc' ? '▲' : '▼';
    }
    return '';
}

// 판매점별 상세 정보를 표시하는 함수
function showStoreDetails(manager) {
    const managerData = processData(currentlyDisplayedData);
    const selectedManager = managerData.find(m => m['담당'] === manager);
    currentManagerStoreList = Object.values(selectedManager.storeList).flat();

    const detailsContainer = document.getElementById('details-table');
    detailsContainer.innerHTML = `
        <div class="details-header">
            <h2>${manager} 담당 판매점 상세</h2>
            <div class="nav-buttons">
                 <button class="btn" onclick="goBackToManagerTable()">담당자 실적 보기</button>
                 <button class="btn" onclick="downloadManagerCSV('${manager}')">담당자 실적 다운로드</button>
            </div>
            <div class="filter-controls">
                <select id="filter-column">
                    <option value="모델명">모델명</option>
                    <option value="개통유형">개통유형</option>
                    <option value="약정">약정</option>
                    <option value="요금제">요금제</option>
                    <option value="부가서비스">부가서비스</option>
                </select>
                <input type="text" id="filter-value" placeholder="검색어 입력...">
                <button class="btn" onclick="applyFilter()">검색</button>
            </div>
        </div>
    `;
    renderStoreDetailsTable(1); // 첫 페이지로 상세 테이블을 렌더링
}

// 상세 정보 테이블을 렌더링하는 함수
function renderStoreDetailsTable(page = 1) {
    let dataToRender = currentManagerStoreList;

    // 정렬 적용
    dataToRender.sort((a, b) => {
        let valA = a[detailSortCriteria];
        let valB = b[detailSortCriteria];

        // 날짜 형식인 경우 Date 객체로 변환하여 비교
        if (detailSortCriteria === '개통일') {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) {
            return detailSortOrder === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return detailSortOrder === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const totalItems = dataToRender.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedData = dataToRender.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const detailsContainer = document.getElementById('details-table');
    let html = detailsContainer.innerHTML.split('<div class="table-container">')[0]; // 헤더 유지

    html += `
    <div class="table-container"><table>
        <tr>
            <th class="sortable" onclick="setDetailSort('접수코드불일치')">접수코드불일치 ${getSortArrow('접수코드불일치')}</th>
            <th class="sortable" onclick="setDetailSort('개통일')">개통일 ${getSortArrow('개통일')}</th>
            <th class="sortable" onclick="setDetailSort('모델명')">모델명 ${getSortArrow('모델명')}</th>
            <th class="sortable" onclick="setDetailSort('일련번호')">일련번호 ${getSortArrow('일련번호')}</th>
            <th class="sortable" onclick="setDetailSort('개통유형')">개통유형 ${getSortArrow('개통유형')}</th>
            <th class="sortable" onclick="setDetailSort('약정')">약정 ${getSortArrow('약정')}</th>
            <th class="sortable" onclick="setDetailSort('고객명')">고객명 ${getSortArrow('고객명')}</th>
            <th class="sortable" onclick="setDetailSort('개통번호')">개통번호 ${getSortArrow('개통번호')}</th>
            <th class="sortable" onclick="setDetailSort('요금제')">요금제 ${getSortArrow('요금제')}</th>
            <th class="sortable" onclick="setDetailSort('부가서비스')">부가서비스 ${getSortArrow('부가서비스')}</th>
            <th class="sortable" onclick="setDetailSort('당유')">당유 ${getSortArrow('당유')}</th>
        </tr>
    `;
    paginatedData.forEach(row => {
        html += `
            <tr>
                <td>${row['접수코드불일치']}</td>
                <td>${row['개통일']}</td>
                <td>${row['모델명']}</td>
                <td>${row['일련번호']}</td>
                <td>${row['개통유형']}</td>
                <td>${row['약정']}</td>
                <td>${row['고객명']}</td>
                <td>${row['개통번호']}</td>
                <td>${row['요금제']}</td>
                <td>${row['부가서비스']}</td>
                <td>${row['당유']}</td>
            </tr>
        `;
    });
    html += `</table></div>`;

    if (totalPages > 1) {
        html += `<div class="pagination-controls">`;
        if (page > 1) {
            html += `<button class="btn" onclick="renderStoreDetailsTable(${page - 1})">이전</button>`;
        }
        html += `<span class="pagination-info">${page} / ${totalPages} 페이지</span>`;
        if (page < totalPages) {
            html += `<button class="btn" onclick="renderStoreDetailsTable(${page + 1})">다음</button>`;
        }
        html += `</div>`;
    }

    document.getElementById('details-table').innerHTML = html;
}



// 상세 정보 테이블의 정렬 기준을 설정하는 함수
function setDetailSort(criteria) {
    if (detailSortCriteria === criteria) {
        detailSortOrder = detailSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        detailSortCriteria = criteria;
        detailSortOrder = (criteria === '개통일') ? 'desc' : 'asc';
    }
    renderStoreDetailsTable(1);
}


// 필터링을 적용하는 함수
function applyFilter() {
    const column = document.getElementById('filter-column').value;
    const value = document.getElementById('filter-value').value.toLowerCase();
    const managerData = processData(currentlyDisplayedData);
    const selectedManager = managerData.find(m => m['담당'] === document.querySelector('#details-table h2').textContent.split(' ')[0]);

    let flatStoreList = Object.values(selectedManager.storeList).flat();

    if (value) {
        currentManagerStoreList = flatStoreList.filter(row => {
            return row[column] && row[column].toLowerCase().includes(value);
        });
    } else {
        // 검색어가 없으면 필터링 해제
        currentManagerStoreList = flatStoreList;
    }

    renderStoreDetailsTable(1);
}

// 담당자 실적 보기로 돌아가는 함수
function goBackToManagerTable() {
    document.getElementById('details-table').innerHTML = '';
    const managerData = processData(currentlyDisplayedData);
    renderManagerTable(managerData);
}

// 담당자별 실적을 CSV로 다운로드하는 함수
function downloadManagerCSV(manager) {
    const managerData = processData(currentlyDisplayedData);
    const selectedManager = managerData.find(m => m['담당'] === manager);
    let dataToDownload = Object.values(selectedManager.storeList).flat();

    // Papa.unparse를 사용하여 CSV 문자열 생성
    const csv = Papa.unparse(dataToDownload);

    // 다운로드 링크 생성 및 클릭
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${manager}_실적.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// 전체 데이터를 대상으로 검색을 수행하는 함수
function performGlobalSearch() {
    const query = document.getElementById('global-search-input').value.toLowerCase();

    if (!query) {
        currentlyDisplayedData = allData;
        currentSearchResults = []; // 검색어 없으면 초기화
    } else {
        currentSearchResults = allData.filter(row => {
            // '모델명', '일련번호', '고객명', '개통번호' 컬럼에서 검색
            return (row['모델명'] && row['모델명'].toLowerCase().includes(query)) ||
                   (row['일련번호'] && row['일련번호'].toLowerCase().includes(query)) ||
                   (row['고객명'] && row['고객명'].toLowerCase().includes(query)) ||
                   (row['개통번호'] && row['개통번호'].toLowerCase().includes(query));
        });
        currentlyDisplayedData = currentSearchResults;
    }
    
    // 검색 결과로 담당자 테이블을 다시 렌더링
    const managerData = processData(currentlyDisplayedData);
    renderManagerTable(managerData);
    
    // 상세 정보 테이블은 숨김
    document.getElementById('details-table').innerHTML = '';
}
