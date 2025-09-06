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
        // 그 후에 관리자 페이지로 이동합니다.
        window.location.href = '/admin.html';
    } else if (password !== null) { // 사용자가 '취소'를 누르지 않았을 때만
        alert("비밀번호가 틀렸습니다.");
    }
}


// 서버로부터 최신 데이터를 가져오는 함수
function fetchData() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                // ✨✨✨ 변경점: 데이터 없을 시 안내 문구의 링크 수정 ✨✨✨
                document.getElementById('display-area').innerHTML = 
                    `<p>데이터가 없습니다. <a href="#" onclick="promptForAdminPassword()">관리자 페이지</a>에서 CSV 파일을 업로드해주세요.</p>`;
                document.getElementById('group-buttons-container').innerHTML = '';
                return;
            }
            allData = data;
            displayGroupButtons();
        })
        .catch(error => {
            console.error('데이터를 가져오는 중 오류 발생:', error);
            document.getElementById('display-area').innerHTML = '<p>데이터를 불러오는 데 실패했습니다. 서버 상태를 확인해주세요.</p>';
        });
}


// (이하 나머지 코드는 이전 답변의 최종본과 동일합니다. 전체를 복사해서 붙여넣으세요.)

// ✨✨✨ 3. 기존 downloadCSV 함수를 이 코드로 교체해주세요 ✨✨✨
function downloadCSV() {
    if (currentlyDisplayedData.length === 0) {
        alert("다운로드할 데이터가 없습니다.");
        return;
    }

    // 다운로드할 항목과 순서를 직접 지정합니다.
    const headersToExport = [
        '가입번호', '담당', '판매점명', '연합', '개통일', '고객명', '개통번호', 
        '개통유형', '약정', '모델명', '일련번호', '요금제', '부가서비스', 
        '당유', '접수코드불일치'
    ];
    
    let csvContent = "\uFEFF" + headersToExport.join(",") + "\n"; // UTF-8 BOM 추가

    currentlyDisplayedData.forEach(row => {
        const values = headersToExport.map(header => {
            let value = row[header] === null || row[header] === undefined ? '' : row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += values.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const filename = `${document.querySelector('#display-area h2').textContent.trim()}.csv`;
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


// 1. 전체 조회 기능 (수정됨)
function performGlobalSearch() {
    const searchTerm = document.getElementById('global-search-input').value.toLowerCase();
    if (!searchTerm) {
        document.getElementById('display-area').innerHTML = '';
        return;
    }

    const searchKeys = ['가입번호', '모델명', '일련번호', '고객명', '개통번호', '판매점명', '담당'];
    currentSearchResults = allData.filter(row => { // 검색 결과를 전역 변수에 저장
        return searchKeys.some(key => 
            row[key] && row[key].toString().toLowerCase().includes(searchTerm)
        );
    });

    renderSearchResults(); // 새로운 그리기 함수 호출
}

// 2. 전체 조회 정렬 기준을 설정하는 새로운 함수 (추가)
function setGlobalSort(criteria) {
    if (globalSortCriteria === criteria) {
        globalSortOrder = globalSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
        globalSortCriteria = criteria;
        globalSortOrder = 'desc';
    }
    renderSearchResults(); // 변경된 기준으로 다시 그리기
}

// 3. 전체 조회 결과를 그리고 정렬하는 새로운 함수 (추가)
function renderSearchResults() {
    currentlyDisplayedData = currentSearchResults;
    const displayArea = document.getElementById('display-area');
    const searchTerm = document.getElementById('global-search-input').value;

    // 정렬 로직 적용
    currentSearchResults.sort((a, b) => {
        const valA = a[globalSortCriteria] || '';
        const valB = b[globalSortCriteria] || '';
        if (globalSortOrder === 'asc') {
            return valA.toString().localeCompare(valB.toString());
        } else {
            return valB.toString().localeCompare(valA.toString());
        }
    });
    
    const getSortArrow = (columnName) => {
        return globalSortCriteria === columnName ? (globalSortOrder === 'desc' ? '▼' : '▲') : '';
    };

    let html = `
        <div class="details-header">
            <h2>'${searchTerm}' 검색 결과 (총 ${currentSearchResults.length}건)</h2>
            <button class="btn btn-download" onclick="downloadCSV()">CSV 다운로드</button>
        </div>
    `;

    if (currentSearchResults.length === 0) {
        html += '<p>일치하는 결과가 없습니다.</p>';
        displayArea.innerHTML = html;
        return;
    }

    html += `<div class="table-wrapper"><table>
        <tr>
            <th class="sortable" onclick="setGlobalSort('가입번호')">가입번호 ${getSortArrow('가입번호')}</th>
            <th class="sortable" onclick="setGlobalSort('그룹')">그룹 ${getSortArrow('그룹')}</th>
            <th class="sortable" onclick="setGlobalSort('담당')">담당 ${getSortArrow('담당')}</th>
            <th class="sortable" onclick="setGlobalSort('판매점명')">판매점명 ${getSortArrow('판매점명')}</th>
            <th class="sortable" onclick="setGlobalSort('개통일')">개통일 ${getSortArrow('개통일')}</th>
            <th class="sortable" onclick="setGlobalSort('고객명')">고객명 ${getSortArrow('고객명')}</th>
            <th class="sortable" onclick="setGlobalSort('개통번호')">개통번호 ${getSortArrow('개통번호')}</th>
            <th class="sortable" onclick="setGlobalSort('모델명')">모델명 ${getSortArrow('모델명')}</th>
            <th class="sortable" onclick="setGlobalSort('일련번호')">일련번호 ${getSortArrow('일련번호')}</th>
        </tr>
    `;
    currentSearchResults.forEach(row => {
        html += `
            <tr>
                <td>${row['가입번호'] || ''}</td>
                <td>${row['그룹'] || ''}</td>
                <td>${row['담당'] || ''}</td>
                <td>${row['판매점명'] || ''}</td>
                <td>${row['개통일'] || ''}</td>
                <td>${row['고객명'] || ''}</td>
                <td>${row['개통번호'] || ''}</td>
                <td>${row['모델명'] || ''}</td>
                <td>${row['일련번호'] || ''}</td>
            </tr>
        `;
    });
    html += `</table></div>`;
    displayArea.innerHTML = html;
}


// 2. 그룹 버튼을 생성하는 함수
function displayGroupButtons() {
    document.querySelector('.global-search-container').style.display = 'block';
    document.getElementById('display-area').innerHTML = '';

    const container = document.getElementById('group-buttons-container');
    container.innerHTML = '';
    container.style.display = 'flex'; 

    const order = ['전체', '부산', '울산', '경남', '대구', '경주포항', '구미'];
    const groups = [...new Set(allData.map(item => (item['그룹'] || '').trim()).filter(g => g))];

    const sortedGroups = order.filter(groupName => groupName === '전체' || groups.includes(groupName));
    
    groups.forEach(group => {
        if (!sortedGroups.includes(group)) {
            sortedGroups.push(group);
        }
    });


    sortedGroups.forEach(group => {
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = group;
        button.addEventListener('click', () => displayGroupDetails(group));
        container.appendChild(button);
    });
}

// 숫자를 더 안전하게 변환하는 헬퍼 함수
function safeParseInt(value) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function safeParseFloat(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
}

// 3. 그룹 버튼 클릭 시 담당별/그룹별 실적을 표시하는 함수
function displayGroupDetails(groupName) {
     document.querySelector('.global-search-container').style.display = 'none';

     const displayArea = document.getElementById('display-area');
     
     const isOverallView = groupName === '전체';
     const dataToShow = isOverallView ? allData : allData.filter(row => (row['그룹'] || '').trim() === groupName);
     const aggregationKey = isOverallView ? '그룹' : '담당';
         
     const stats = {};
     dataToShow.forEach(row => {
         const key = (row[aggregationKey] || '기타').trim();
         if (!key) return;

         if (!stats[key]) {
            stats[key] = { '신규': 0, 'MNP': 0, '기변': 0, '2nd': 0, '합계': 0, 'VAS': 0, '고가치(95)': 0, 'VAS모수': 0, '고가치모수': 0, '당유인정': 0, '당유전체': 0 };
        }
         stats[key]['신규'] += safeParseInt(row['신규']);
         stats[key]['MNP'] += safeParseInt(row['MNP']);
         stats[key]['기변'] += safeParseInt(row['기변']);
         stats[key]['합계'] += safeParseInt(row['합계']);
         stats[key]['VAS'] += safeParseFloat(row['VAS']);
         stats[key]['고가치(95)'] += safeParseFloat(row['고가치(95)']);
         stats[key]['VAS모수'] += safeParseInt(row['VAS모수']);
         stats[key]['고가치모수'] += safeParseInt(row['고가치모수']);
         
         if (row['모델유형'] && row['모델유형'].includes('2nd')) {
             stats[key]['2nd'] += 1;
         }
         if (row['당유'] === '인정') {
             stats[key]['당유인정'] += 1;
             stats[key]['당유전체'] += 1;
        } else if (row['당유'] === '미인정') {
            stats[key]['당유전체'] += 1;
        }
     });

     let html = `
         <div class="details-header">
             <h2>${groupName} 실적</h2>
             <button class="btn btn-home" onclick="displayGroupButtons()">처음으로</button>
         </div>
         <div class="table-wrapper"><table><tr><th>항목</th>
     `;
     
     const columns = Object.keys(stats).sort((a, b) => {
         return stats[b]['합계'] - stats[a]['합계'];
     });
     
     const fields = ['신규', 'MNP', '기변', '2nd', '합계', 'MNP(%)', 'VAS(%)', '고가치(95)(%)', '당유(%)'];

     if (isOverallView) {
        // ✨ 수정된 부분 1: totalStats 객체에 '당유인정', '당유전체' 추가
         const totalStats = { '신규': 0, 'MNP': 0, '기변': 0, '2nd': 0, '합계': 0, 'VAS': 0, '고가치(95)': 0, 'VAS모수': 0, '고가치모수': 0, '당유인정': 0, '당유전체': 0 };
         Object.values(stats).forEach(groupStat => {
             for (const key in totalStats) {
                 totalStats[key] += groupStat[key];
             }
         });
         
         html += `<th>그룹전체</th>`;
         columns.forEach(col => {
             html += `<th>${col}</th>`;
         });
         html += `</tr>`;

         fields.forEach(field => {
             html += `<tr><td>${field}</td>`;

             let totalValue = '';
             if (field === 'MNP(%)') {
                 const totalSales = totalStats['신규'] + totalStats['MNP'] + totalStats['기변'];
                 totalValue = totalSales > 0 ? ((totalStats['MNP'] / totalSales) * 100).toFixed(2) + '%' : '0%';
             } else if (field === 'VAS(%)') {
                 totalValue = totalStats['VAS모수'] > 0 ? ((totalStats['VAS'] / totalStats['VAS모수']) * 100).toFixed(2) + '%' : '0%';
             } else if (field === '고가치(95)(%)') {
                 totalValue = totalStats['고가치모수'] > 0 ? ((totalStats['고가치(95)'] / totalStats['고가치모수']) * 100).toFixed(2) + '%' : '0%';
            // ✨ 수정된 부분 2: '당유(%)' 계산 시 변수명 오류 수정
             } else if (field === '당유(%)') {
                 totalValue = totalStats['당유전체'] > 0 ? ((totalStats['당유인정'] / totalStats['당유전체']) * 100).toFixed(2) + '%' : '0%';
             } else {
                 totalValue = totalStats[field.replace('(%)', '')];
             }
             html += `<td>${totalValue}</td>`;

             columns.forEach(col => {
                 const statData = stats[col];
                 let value = '';
                 if (field === 'MNP(%)') {
                     const totalSales = statData['신규'] + statData['MNP'] + statData['기변'];
                     value = totalSales > 0 ? ((statData['MNP'] / totalSales) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === 'VAS(%)') {
                     value = statData['VAS모수'] > 0 ? ((statData['VAS'] / statData['VAS모수']) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === '고가치(95)(%)') {
                     value = statData['고가치모수'] > 0 ? ((statData['고가치(95)'] / statData['고가치모수']) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === '당유(%)') {
                     value = statData['당유전체'] > 0 ? ((statData['당유인정'] / statData['당유전체']) * 100).toFixed(2) + '%' : '0%';    
                 } else {
                     value = statData[field.replace('(%)', '')];
                 }

                    if (field === '합계') {
                        html += `<td><strong>${value}</strong></td>`;
                    } else {
                        html += `<td>${value}</td>`;
                    }
             });
             html += `</tr>`;
         });

     } else {
         columns.forEach(col => {
             html += `<th><button class="btn btn-secondary" onclick="displayManagerDetails('${col}')">상세</button><br>${col}</th>`;
         });
         html += `</tr>`;
         
         fields.forEach(field => {
             html += `<tr><td>${field}</td>`;
             columns.forEach(col => {
                 const statData = stats[col];
                 let value = '';
                 if (field === 'MNP(%)') {
                     const totalSales = statData['신규'] + statData['MNP'] + statData['기변'];
                     value = totalSales > 0 ? ((statData['MNP'] / totalSales) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === 'VAS(%)') {
                     value = statData['VAS모수'] > 0 ? ((statData['VAS'] / statData['VAS모수']) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === '고가치(95)(%)') {
                     value = statData['고가치모수'] > 0 ? ((statData['고가치(95)'] / statData['고가치모수']) * 100).toFixed(2) + '%' : '0%';
                 } else if (field === '당유(%)') {
                    value = statData['당유전체'] > 0 ? ((statData['당유인정'] / statData['당유전체']) * 100).toFixed(2) + '%' : '0%';    
                 } else {
                     value = statData[field.replace('(%)', '')];
                 }
                 html += `<td>${value}</td>`;
             });
             html += `</tr>`;
         });
     }
     
     html += `</table></div>`;
     displayArea.innerHTML = html;
}

// 4. 담당자 '상세보기' 클릭 시 판매점별 실적 표시
let currentManagerName = '';
let currentStoreStats = {};

function displayManagerDetails(managerName) {
    document.querySelector('.global-search-container').style.display = 'none';
    document.getElementById('group-buttons-container').style.display = 'none';

    currentManagerName = managerName;
    const managerData = allData.filter(row => row['담당'] === managerName);
    currentStoreStats = {};
    managerData.forEach(row => {
        const store = row['판매점명'];
        if (!currentStoreStats[store]) {
            currentStoreStats[store] = { '신규': 0, 'MNP': 0, '기변': 0, '2nd': 0, '합계': 0, 'VAS': 0, '고가치(95)': 0, 'VAS모수': 0, '고가치모수': 0, '당유인정': 0, '당유전체': 0 };
}
        currentStoreStats[store]['신규'] += safeParseInt(row['신규']);
        currentStoreStats[store]['MNP'] += safeParseInt(row['MNP']);
        currentStoreStats[store]['기변'] += safeParseInt(row['기변']);
        currentStoreStats[store]['합계'] += safeParseInt(row['합계']);
        currentStoreStats[store]['VAS'] += safeParseFloat(row['VAS']);
        currentStoreStats[store]['고가치(95)'] += safeParseFloat(row['고가치(95)']);
        currentStoreStats[store]['VAS모수'] += safeParseInt(row['VAS모수']);
        currentStoreStats[store]['고가치모수'] += safeParseInt(row['고가치모수']);
        
        if (row['모델유형'] && row['모델유형'].includes('2nd')) {
            currentStoreStats[store]['2nd'] += 1;
        }
        if (row['당유'] === '인정') {
   currentStoreStats[store]['당유인정'] += 1;
    currentStoreStats[store]['당유전체'] += 1;
} else if (row['당유'] === '미인정') {
    currentStoreStats[store]['당유전체'] += 1;
}
    });

    renderManagerDetails();
}

function setSort(criteria) {
    if (currentSortCriteria === criteria) {
        currentSortOrder = currentSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
        currentSortCriteria = criteria;
        currentSortOrder = 'desc';
    }
    renderManagerDetails();
}

function renderManagerDetails() {
    const displayArea = document.getElementById('display-area');

    let html = `
        <div class="details-header">
            <h2>${currentManagerName} 담당 판매점 목록</h2>
            <button class="btn btn-home" onclick="displayGroupButtons()">처음으로</button>
        </div>
    `;
    
    html += `
        <div class="sort-controls">
            <button class="btn" onclick="setSort('합계')">합계순 ${currentSortCriteria === '합계' ? (currentSortOrder === 'desc' ? '▼' : '▲') : ''}</button>
            <button class="btn" onclick="setSort('이름')">이름순 ${currentSortCriteria === '이름' ? (currentSortOrder === 'desc' ? '▼' : '▲') : ''}</button>
        </div>
    `;

    html += `<ul class="details-list">`;
    
    const sortedStores = Object.keys(currentStoreStats).sort((a, b) => {
        if (currentSortCriteria === '이름') {
            return currentSortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
        } else {
            // 합계가 같을 경우 이름순으로 정렬
            if (currentStoreStats[b]['합계'] === currentStoreStats[a]['합계']) {
                return a.localeCompare(b);
            }
            return currentSortOrder === 'asc' ? currentStoreStats[a]['합계'] - currentStoreStats[b]['합계'] : currentStoreStats[b]['합계'] - currentStoreStats[a]['합계'];
        }
    });

    currentManagerStoreList = sortedStores;

    sortedStores.forEach(store => {
        const stats = currentStoreStats[store];
        const vasPercent = stats['VAS모수'] > 0 ? ((stats['VAS'] / stats['VAS모수']) * 100).toFixed(2) : "0.00";
        const highValuePercent = stats['고가치모수'] > 0 ? ((stats['고가치(95)'] / stats['고가치모수']) * 100).toFixed(2) : "0.00";
        // 당유 퍼센트 계산 추가
        const dangyouPercent = stats['당유전체'] > 0 ? ((stats['당유인정'] / stats['당유전체']) * 100).toFixed(2) : "0.00";
        
        // ✨✨✨ HTML 구조를 이미지와 같이 변경하는 부분 ✨✨✨
        html += `
            <li>
                <button class="btn btn-secondary" onclick="displayStoreDetails('${store}', '${currentManagerName}')">상세</button>
                <div class="store-info">
                    <p class="store-name">${store}</p>
                    <p class="stats-line">- 합계: <strong>${stats['합계']}</strong> (신규:${stats['신규']}, MNP:${stats['MNP']}, 기변:${stats['기변']}, 2nd:${stats['2nd']})</p>
                    <p class="stats-line">- VAS: ${vasPercent}% | 고가치(95): ${highValuePercent}% | 당유: ${dangyouPercent}%</p>
                </div>
            </li>
        `;
    });
    html += `</ul>`;
    displayArea.innerHTML = html;
}


// 5. 판매점 '상세보기' 클릭 시 개통 건별 리스트 표시
let currentStoreData = []; 
let currentPage = 1;
let currentStoreName = '';
let currentManagerForStore = '';

function displayStoreDetails(storeName, managerName) {
    document.querySelector('.global-search-container').style.display = 'none';
    document.getElementById('group-buttons-container').style.display = 'none';
    
    currentStoreName = storeName;
    currentManagerForStore = managerName;
    currentStoreData = allData.filter(row => row['판매점명'] === storeName);
    currentFilterValue = ''; 
    renderStoreDetailsTable();
}

function handleFilterInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applyStoreFilter();
    }, 300);
}

function applyStoreFilter() {
    currentFilterColumn = document.getElementById('filter-column').value;
    currentFilterValue = document.getElementById('filter-input').value;
    renderStoreDetailsTable();
}

function setDetailSort(criteria) {
    if (detailSortCriteria === criteria) {
        detailSortOrder = detailSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
        detailSortCriteria = criteria;
        detailSortOrder = 'desc';
    }
    renderStoreDetailsTable();
}


function renderStoreDetailsTable(page = 1) {
    currentPage = page;

    const filteredData = currentFilterValue 
        ? currentStoreData.filter(row => 
            row[currentFilterColumn] && row[currentFilterColumn].toString().toLowerCase().includes(currentFilterValue.toLowerCase())
        )
        : currentStoreData;
    
    filteredData.sort((a, b) => {
        const valA = a[detailSortCriteria] || '';
        const valB = b[detailSortCriteria] || '';
        if (detailSortOrder === 'asc') {
            return valA.toString().localeCompare(valB.toString());
        } else {
            return valB.toString().localeCompare(valA.toString());
        }
    });

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    currentlyDisplayedData = paginatedData;

    const currentIndex = currentManagerStoreList.indexOf(currentStoreName);
    const prevStoreName = currentIndex > 0 ? currentManagerStoreList[currentIndex - 1] : null;
    const nextStoreName = currentIndex < currentManagerStoreList.length - 1 ? currentManagerStoreList[currentIndex + 1] : null;
    
    const getSortArrow = (columnName) => {
        return detailSortCriteria === columnName ? (detailSortOrder === 'desc' ? '▼' : '▲') : '';
    };

    let html = `
        <div class="details-header">
            <h2>${currentStoreName} 개통 목록 (총 ${filteredData.length}건)</h2>
            <div class="nav-buttons">
                <button class="btn btn-home" onclick="displayGroupButtons()">처음으로</button>
                <button class="btn btn-nav" onclick="displayStoreDetails('${prevStoreName}', '${currentManagerForStore}')" ${!prevStoreName ? 'disabled' : ''}>◀ 이전</button>
                <button class="btn btn-back" onclick="displayManagerDetails('${currentManagerForStore}')">목록</button>
                <button class="btn btn-nav" onclick="displayStoreDetails('${nextStoreName}', '${currentManagerForStore}')" ${!nextStoreName ? 'disabled' : ''}>다음 ▶</button>
                <button class="btn btn-download" onclick="downloadCSV()">CSV 다운로드</button>
            </div>
        </div>
        
        <div class="filter-controls">
            <select id="filter-column" onchange="applyStoreFilter()">
                <option value="모델명">모델명</option>
                <option value="고객명">고객명</option>
                <option value="개통번호">개통번호</option>
                <option value="일련번호">일련번호</option>
                <option value="개통유형">개통유형</option>
                <option value="요금제">요금제</option>
                <option value="부가서비스">부가서비스</option>
            </select>
            <input type="text" id="filter-input" oninput="handleFilterInput()" placeholder="검색어 입력...">
        </div>

        <div class="table-wrapper"><table>
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
        if (currentPage > 1) {
            html += `<button class="btn" onclick="renderStoreDetailsTable(${currentPage - 1})">이전</button>`;
        }
        html += `<span class="pagination-info">${currentPage} / ${totalPages} 페이지</span>`;
        if (currentPage < totalPages) {
            html += `<button class="btn" onclick="renderStoreDetailsTable(${currentPage + 1})">다음</button>`;
        }
        html += `</div>`;
    }

    document.getElementById('display-area').innerHTML = html;
    
    document.getElementById('filter-column').value = currentFilterColumn;
    document.getElementById('filter-input').value = currentFilterValue;
}






