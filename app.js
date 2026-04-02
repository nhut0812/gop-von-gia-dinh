// Dữ liệu ứng dụng
let appData = {
    settings: {
        monthlyAmount: 200000
    },
    members: [],
    transactions: []
};

// Tiền trả nợ mặc định hằng tháng
const DEFAULT_REPAY_AMOUNT = 200000;
// Tiền vào quỹ mặc định (phần công vốn thực)
const DEFAULT_CONTRIBUTE_AMOUNT = 200000;

// Trạng thái thay đổi dữ liệu
let hasChanges = false;

// Đánh dấu dữ liệu có thay đổi và hiển thị nút lưu
function markAsChanged() {
    if (!hasChanges) {
        hasChanges = true;
        updateSaveButtonUI();
    }
}

// Cập nhật giao diện nút lưu
function updateSaveButtonUI() {
    const saveBtn = document.getElementById('saveBtn');
    const indicator = document.getElementById('unsavedIndicator');
    
    if (hasChanges) {
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (indicator) indicator.style.display = 'inline-block';
    } else {
        if (saveBtn) saveBtn.style.display = 'none';
        if (indicator) indicator.style.display = 'none';
    }
}

// Lưu tất cả thay đổi khi người dùng nhấn nút Lưu
async function saveAllChanges() {
    saveData();
    hasChanges = false;
    updateSaveButtonUI();
    showNotification('✅ Đã lưu tất cả thay đổi!', 'success');
}

// Authentication
const ADMIN_PASSWORD = '123456'; // Thay đổi mật khẩu này
let isAuthenticated = false;

// Firebase
let db = null;
let currentUserId = 'family-fund'; // ID cố định cho gia đình

// Khởi tạo Firebase
function initFirebase() {
    try {
        if (window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
            db = firebase.firestore();
            console.log('✅ Firebase initialized successfully');
            return true;
        } else {
            console.warn('⚠️ Firebase config not found, using localStorage');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        console.warn('⚠️ Falling back to localStorage');
        return false;
    }
}

// Khởi tạo ứng dụng
async function initApp() {
    // Kiểm tra trạng thái đăng nhập
    checkAuthStatus();
    
    const useFirebase = initFirebase();
    
    // Set ngày mặc định
    const today = new Date();
    document.getElementById('contributeMonth').value = today.toISOString().slice(0, 7);
    document.getElementById('withdrawDate').value = today.toISOString().slice(0, 10);
    
    // Load dữ liệu từ Firebase trước
    if (useFirebase) {
        await loadDataFromFirebase();
    } else {
        loadDataFromLocalStorage();
        // Render giao diện nếu dùng localStorage
        renderMembers();
        renderSummary();
        renderHistory();
        updateWithdrawMemberSelect();
        updateContributeMemberSelect();
        updateMemberFilter();
        renderDashboard();
    }
    
    updateSettings();
    updateUIBasedOnAuth();
    updateSaveButtonUI();
}

// Lưu và tải dữ liệu từ Firebase
async function saveDataToFirebase() {
    if (!db) {
        saveDataToLocalStorage();
        return;
    }
    
    try {
        await db.collection('funds').doc(currentUserId).set({
            data: appData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Data saved to Firebase');
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        showNotification('Lỗi lưu dữ liệu online! Đã lưu offline.', 'error');
        saveDataToLocalStorage();
    }
}

async function loadDataFromFirebase() {
    if (!db) {
        loadDataFromLocalStorage();
        return;
    }
    
    try {
        const doc = await db.collection('funds').doc(currentUserId).get();
        if (doc.exists) {
            const savedData = doc.data();
            console.log('Raw Firebase data:', savedData);
            
            // Kiểm tra và xử lý cấu trúc dữ liệu
            if (savedData && savedData.data) {
                appData = savedData.data;
            } else if (savedData && savedData.settings) {
                // Dữ liệu cũ không có wrapper 'data'
                appData = savedData;
            } else {
                console.warn('⚠️ Invalid data structure from Firebase');
                return;
            }
            
            // Đảm bảo appData có cấu trúc đúng
            if (!appData.members) appData.members = [];
            if (!appData.transactions) appData.transactions = [];
            if (!appData.settings) appData.settings = { monthlyAmount: 200000 };
            
            console.log('✅ Data loaded from Firebase');
            
            // Render giao diện sau khi load xong
            renderMembers();
            renderSummary();
            renderHistory();
            updateWithdrawMemberSelect();
            updateContributeMemberSelect();
            updateMemberFilter();
            renderDashboard();
        } else {
            console.log('ℹ️ No Firebase data found, starting fresh');
        }
    } catch (error) {
        console.error('❌ Error loading from Firebase:', error);
        showNotification('Không thể tải dữ liệu online! Dùng dữ liệu offline.', 'error');
        loadDataFromLocalStorage();
    }
}

// Backup: LocalStorage functions
function saveDataToLocalStorage() {
    localStorage.setItem('familyFundData', JSON.stringify(appData));
}

function loadDataFromLocalStorage() {
    const saved = localStorage.getItem('familyFundData');
    if (saved) {
        appData = JSON.parse(saved);
    }
}

// Hàm saveData và loadData chính
function saveData() {
    if (db) {
        saveDataToFirebase();
    } else {
        saveDataToLocalStorage();
    }
}

function loadData() {
    // Được gọi trong initApp
}

// Cài đặt
function updateSettings() {
    // Chỉ kiểm tra auth khi được gọi từ button click (có event)
    if (typeof event !== 'undefined' && !requireAuth()) return;
    
    const monthlyAmount = parseInt(document.getElementById('monthlyAmount').value);
    appData.settings.monthlyAmount = monthlyAmount;
    if (typeof event !== 'undefined') {
        markAsChanged();
        showNotification('Đã cập nhật cài đặt!', 'success');
    }
}

// Quản lý thành viên
function addMember() {
    if (!requireAuth()) return;
    
    const nameInput = document.getElementById('newMemberName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('Vui lòng nhập tên thành viên!', 'error');
        return;
    }
    
    if (appData.members.find(m => m.name === name)) {
        showNotification('Thành viên đã tồn tại!', 'error');
        return;
    }
    
    appData.members.push({
        id: Date.now(),
        name: name,
        joinDate: new Date().toISOString()
    });
    
    nameInput.value = '';
    markAsChanged();
    renderMembers();
    updateWithdrawMemberSelect();
    updateContributeMemberSelect();
    updateMemberFilter();
    renderSummary();
    renderDashboard();
    showNotification(`Đã thêm thành viên ${name}!`, 'success');
}

function removeMember(memberId) {
    if (!requireAuth()) return;
    
    const member = appData.members.find(m => m.id === memberId);
    if (!member) return;
    
    if (!confirm(`Bạn có chắc muốn xóa thành viên "${member.name}"?\nToàn bộ lịch sử giao dịch của thành viên này sẽ bị xóa.`)) {
        return;
    }
    
    appData.members = appData.members.filter(m => m.id !== memberId);
    appData.transactions = appData.transactions.filter(t => t.memberId !== memberId);
    
    markAsChanged();
    renderMembers();
    updateWithdrawMemberSelect();
    updateContributeMemberSelect();
    updateMemberFilter();
    renderSummary();
    renderHistory();
    renderDashboard();
    showNotification('Đã xóa thành viên!', 'success');
}

function renderMembers() {
    const container = document.getElementById('membersList');
    
    if (appData.members.length === 0) {
        container.innerHTML = '<p style="color: #999;">Chưa có thành viên nào. Hãy thêm thành viên!</p>';
        return;
    }
    
    container.innerHTML = appData.members.map(member => `
        <div class="member-card">
            <button class="delete-btn" onclick="removeMember(${member.id})">×</button>
            <button class="edit-btn" onclick="editMemberName(${member.id})" title="Sửa tên">✏️</button>
            <button class="edit-btn" onclick="editMemberJoinDate(${member.id})" title="Sửa ngày tham gia">📅</button>
            <div>
                <h4>${member.name}</h4>
                <small>Tham gia: ${formatDate(member.joinDate)}</small>
            </div>
        </div>
    `).join('');
}

// Chuyển tab
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Ghi nhận góp vốn tháng
function recordMonthlyContribution() {
    if (!requireAuth()) return;
    
    const monthInput = document.getElementById('contributeMonth').value;
    const selectedMemberId = document.getElementById('contributeMember').value;
    
    if (!monthInput) {
        showNotification('Vui lòng chọn tháng!', 'error');
        return;
    }
    
    if (appData.members.length === 0) {
        showNotification('Chưa có thành viên nào!', 'error');
        return;
    }
    
    // Lọc danh sách thành viên cần ghi nhận
    let membersToProcess = [];
    if (selectedMemberId === 'all') {
        membersToProcess = appData.members;
    } else {
        const member = appData.members.find(m => m.id == selectedMemberId);
        if (member) membersToProcess = [member];
    }
    
    if (membersToProcess.length === 0) {
        showNotification('Không tìm thấy thành viên!', 'error');
        return;
    }
    
    // Kiểm tra xem tháng này đã được ghi nhận chưa (cho từng người)
    const existingContributions = appData.transactions.filter(t => 
        t.type === 'contribute' && t.month === monthInput && 
        membersToProcess.some(m => m.id === t.memberId)
    );
    
    if (existingContributions.length > 0) {
        const names = [...new Set(existingContributions.map(t => t.memberName))].join(', ');
        if (!confirm(`Tháng ${monthInput} đã có ghi nhận góp vốn cho: ${names}. Bạn có muốn ghi nhận lại?`)) {
            return;
        }
        // Xóa các ghi nhận góp vốn và trả nợ cũ của tháng này (cho những người được chọn)
        appData.transactions = appData.transactions.filter(t => 
            !((t.type === 'contribute' || t.type === 'repay') && t.month === monthInput && 
              membersToProcess.some(m => m.id === t.memberId))
        );
    }
    
    // Tạo giao dịch góp vốn cho các thành viên được chọn
    membersToProcess.forEach(member => {
        // Ghi nhận tiền vào quỹ (200k cố định là phần công vốn thực)
        appData.transactions.push({
            id: Date.now() + Math.random(),
            memberId: member.id,
            memberName: member.name,
            type: 'contribute',
            amount: DEFAULT_CONTRIBUTE_AMOUNT,
            month: monthInput,
            date: new Date().toISOString(),
            note: `Góp vốn tháng ${monthInput}`
        });
        
        // Tính số tiền trả nợ (phần còn lại từ tổng góp sau khi trừ tiền vào quỹ)
        const totalInput = appData.settings.monthlyAmount;
        const repayAmount = Math.min(
            totalInput - DEFAULT_CONTRIBUTE_AMOUNT, // Phần còn lại = 700k - 200k = 500k
            getActualRemainingDebt(member.id, monthInput) // Nhưng không vượt quá nợ còn lại
        );
        
        // Nếu có nợ, ghi nhận trả nợ
        if (repayAmount > 0) {
            appData.transactions.push({
                id: Date.now() + Math.random() + 0.1,
                memberId: member.id,
                memberName: member.name,
                type: 'repay',
                amount: repayAmount,
                month: monthInput,
                date: new Date().toISOString(),
                note: `Trả nợ ${formatMoney(repayAmount)}`
            });
        }
    });
    
    markAsChanged();
    renderSummary();
    renderHistory();
    renderDashboard();
    showNotification(`Đã ghi nhận góp vốn tháng ${monthInput} cho ${membersToProcess.length} thành viên!`, 'success');
}

// Lấy số tiền nợ còn lại của một thành viên đến tháng hiện tại
function getActualRemainingDebt(memberId, currentMonth) {
    // Tính tổng tiền đã rút và đã trả nợ đến tháng TRƯỚC tháng hiện tại
    const transactions = appData.transactions.filter(t => {
        if (t.memberId !== memberId) return false;
        const txMonth = t.month || (t.date ? t.date.slice(0, 7) : null);
        return txMonth && txMonth < currentMonth; // Chỉ lấy các tháng TRƯỚC
    });
    
    let totalWithdrawn = 0;
    let totalRepaid = 0;
    
    transactions.forEach(t => {
        if (t.type === 'withdraw') totalWithdrawn += t.amount;
        else if (t.type === 'repay') totalRepaid += t.amount;
    });
    
    // Nợ còn lại = Tổng rút - Tổng đã trả
    const remainingDebt = Math.max(0, totalWithdrawn - totalRepaid);
    return remainingDebt;
}

// Tính số tiền trả nợ mặc định (200k hoặc ít hơn nếu nợ còn lại < 200k)
function calculateDefaultDebt(memberId, currentMonth) {
    // Tính tổng tiền đã rút và đã trả nợ đến tháng TRƯỚC tháng hiện tại
    const transactions = appData.transactions.filter(t => {
        if (t.memberId !== memberId) return false;
        const txMonth = t.month || (t.date ? t.date.slice(0, 7) : null);
        return txMonth && txMonth < currentMonth; // Chỉ lấy các tháng TRƯỚC
    });
    
    let totalWithdrawn = 0;
    let totalRepaid = 0;
    
    transactions.forEach(t => {
        if (t.type === 'withdraw') totalWithdrawn += t.amount;
        else if (t.type === 'repay') totalRepaid += t.amount;
    });
    
    // Nợ còn lại = Tổng rút - Tổng đã trả
    const remainingDebt = totalWithdrawn - totalRepaid;
    
    // Nếu không còn nợ, không cần trả
    if (remainingDebt <= 0) {
        return { repayAmount: 0, remainingDebt: 0 };
    }
    
    // Số tiền trả = min(200k mặc định, nợ còn lại)
    const repayAmount = Math.min(DEFAULT_REPAY_AMOUNT, remainingDebt);
    
    return { repayAmount, remainingDebt };
}

// Ghi nhận rút vốn
function recordWithdrawal() {
    if (!requireAuth()) return;
    
    const memberId = parseInt(document.getElementById('withdrawMember').value);
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const date = document.getElementById('withdrawDate').value;
    const note = document.getElementById('withdrawNote').value.trim();
    
    if (!memberId) {
        showNotification('Vui lòng chọn thành viên!', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('Vui lòng nhập số tiền rút hợp lệ!', 'error');
        return;
    }
    
    if (!date) {
        showNotification('Vui lòng chọn ngày rút!', 'error');
        return;
    }
    
    const member = appData.members.find(m => m.id === memberId);
    
    // Kiểm tra số dư tổng của quỹ
    const totalContributed = appData.transactions
        .filter(t => t.type === 'contribute')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = appData.transactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalRepaid = appData.transactions
        .filter(t => t.type === 'repay')
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Số dư = Tổng góp - (Tổng rút - Tổng đã trả)
    const totalBalance = totalContributed - (totalWithdrawn - totalRepaid);
    
    if (amount > totalBalance) {
        showNotification(
            `Không thể rút! Quỹ chỉ còn ${formatMoney(totalBalance)}. Số tiền rút phải nhỏ hơn hoặc bằng số dư quỹ.`, 
            'error'
        );
        return;
    }
    
    appData.transactions.push({
        id: Date.now(),
        memberId: memberId,
        memberName: member.name,
        type: 'withdraw',
        amount: amount,
        date: date,
        month: date.slice(0, 7), // Thêm month theo định dạng YYYY-MM
        note: note || `Rút vốn ${formatMoney(amount)}`
    });
    
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawNote').value = '';
    
    markAsChanged();
    renderSummary();
    renderHistory();
    renderDashboard();
    showNotification(`Đã ghi nhận ${member.name} rút ${formatMoney(amount)}!`, 'success');
}

// Tính toán tổng hợp cho từng thành viên
function calculateMemberSummary(memberId) {
    const transactions = appData.transactions.filter(t => t.memberId === memberId);
    
    let totalContributed = 0;
    let totalWithdrawn = 0;
    let totalRepaid = 0;
    
    transactions.forEach(t => {
        if (t.type === 'contribute') {
            totalContributed += t.amount;
        } else if (t.type === 'withdraw') {
            totalWithdrawn += t.amount;
        } else if (t.type === 'repay') {
            totalRepaid += t.amount;
        }
    });
    
    // Nợ còn lại = Tổng rút - Tổng đã trả
    const remainingDebt = totalWithdrawn - totalRepaid;
    
    // Số dư = Tổng góp - Nợ còn lại
    const balance = totalContributed - remainingDebt;
    
    return {
        totalContributed,
        totalWithdrawn: remainingDebt, // Hiển thị nợ còn lại thay vì tổng rút
        balance,
        transactionCount: transactions.length
    };
}

// Render bảng tổng hợp
function renderSummary() {
    const container = document.getElementById('summaryTable');
    
    if (appData.members.length === 0) {
        container.innerHTML = '<p style="color: #999;">Chưa có dữ liệu thành viên.</p>';
        return;
    }
    
    // Lấy danh sách các tháng đã góp vốn
    const months = [...new Set(appData.transactions
        .filter(t => t.month)
        .map(t => t.month))]
        .sort();
    
    if (months.length === 0) {
        container.innerHTML = '<p style="color: #999;">Chưa có dữ liệu góp vốn. Hãy ghi nhận góp vốn tháng đầu tiên!</p>';
        return;
    }
    
    // Tính tổng tiền đã góp và tiền thực tế
    const totalContributed = appData.transactions
        .filter(t => t.type === 'contribute')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = appData.transactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalRepaid = appData.transactions
        .filter(t => t.type === 'repay')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const debtRemaining = Math.max(0, totalWithdrawn - totalRepaid);
    const actualMoney = totalContributed - debtRemaining;
    
    // Tạo header của bảng
    let tableHTML = `
        <div class="summary-table-wrapper">
            <table class="monthly-table">
                <thead>
                    <tr>
                        <th rowspan="2" class="month-header">Tháng</th>
                        <th rowspan="2" class="action-header"></th>
                        ${appData.members.map(m => `<th class="member-header">${m.name}</th>`).join('')}
                        <th rowspan="2" class="total-header">Tổng tiền</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Tạo dữ liệu cho từng tháng
    months.forEach((month, index) => {
        const monthLabel = `Tháng ${index + 1}`;
        
        // Tính tổng tiền của tháng này (góp - rút)
        let monthContributeTotal = 0;
        let monthWithdrawTotal = 0;
        
        appData.members.forEach(member => {
            // Tiền góp + trả nợ
            const contribute = appData.transactions.find(t => 
                t.memberId === member.id && t.month === month && t.type === 'contribute'
            );
            const repay = appData.transactions.find(t => 
                t.memberId === member.id && t.month === month && t.type === 'repay'
            );
            monthContributeTotal += (contribute?.amount || 0) + (repay?.amount || 0);
            
            // Tiền rút
            const withdraws = appData.transactions.filter(t => {
                if (t.memberId !== member.id || t.type !== 'withdraw') return false;
                const txMonth = t.month || (t.date ? t.date.slice(0, 7) : null);
                return txMonth === month;
            });
            monthWithdrawTotal += withdraws.reduce((sum, t) => sum + t.amount, 0);
        });
        
        const monthTotal = monthContributeTotal - monthWithdrawTotal;
        
        // Dòng 1: Tiền góp
        let contributeTotal = 0;
        tableHTML += `
            <tr class="month-row">
                <td rowspan="3" class="month-cell">${monthLabel}</td>
                <td class="action-cell contribute-cell">Tiền góp</td>
        `;
        
        appData.members.forEach(member => {
            // Tính tiền góp + tiền trả nợ của tháng này
            const contribute = appData.transactions.find(t => 
                t.memberId === member.id && t.month === month && t.type === 'contribute'
            );
            const repay = appData.transactions.find(t => 
                t.memberId === member.id && t.month === month && t.type === 'repay'
            );
            
            const totalAmount = (contribute?.amount || 0) + (repay?.amount || 0);
            contributeTotal += totalAmount;
            
            tableHTML += `<td class="amount-cell positive">${formatMoney(totalAmount)}</td>`;
        });
        
        tableHTML += `<td rowspan="3" class="total-cell month-total ${monthTotal >= 0 ? 'positive' : 'negative'}">${formatMoney(monthTotal)}</td></tr>`;
        
        // Dòng 2: Tiền rút
        let withdrawTotal = 0;
        tableHTML += `<tr class="month-row"><td class="action-cell withdraw-cell">Tiền rút</td>`;
        
        appData.members.forEach(member => {
            // Lấy tất cả tiền rút của tháng này (có thể rút nhiều lần)
            const withdraws = appData.transactions.filter(t => {
                if (t.memberId !== member.id || t.type !== 'withdraw') return false;
                // Kiểm tra theo month nếu có, hoặc tính từ date
                const txMonth = t.month || (t.date ? t.date.slice(0, 7) : null);
                return txMonth === month;
            });
            const withdrawAmount = withdraws.reduce((sum, t) => sum + t.amount, 0);
            withdrawTotal += withdrawAmount;
            
            tableHTML += `<td class="amount-cell ${withdrawAmount > 0 ? 'negative' : ''}">${withdrawAmount > 0 ? `- ${formatMoney(withdrawAmount)}` : '- ₫'}</td>`;
        });
        
        tableHTML += `</tr>`;
        
        // Dòng 3: Còn lại (số tiền nợ còn phải trả)
        tableHTML += `<tr class="month-row balance-row"><td class="action-cell balance-cell">Còn lại</td>`;
        
        let totalDebtRemaining = 0;
        appData.members.forEach(member => {
            // Tính toán số tiền nợ còn lại đến tháng này
            const memberTransactions = appData.transactions.filter(t => {
                if (t.memberId !== member.id) return false;
                // Lấy month từ trường month hoặc tính từ date
                const txMonth = t.month || (t.date ? t.date.slice(0, 7) : null);
                return txMonth && txMonth <= month;
            });
            
            let withdrawn = 0;
            let repaid = 0;
            
            memberTransactions.forEach(t => {
                if (t.type === 'withdraw') withdrawn += t.amount;
                else if (t.type === 'repay') repaid += t.amount;
            });
            
            // Nợ còn lại = Tổng rút - Tổng đã trả
            const debtRemaining = Math.max(0, withdrawn - repaid);
            totalDebtRemaining += debtRemaining;
            
            tableHTML += `<td class="amount-cell ${debtRemaining > 0 ? 'negative' : 'balance-amount'}">${debtRemaining > 0 ? `- ${formatMoney(debtRemaining)}` : '- ₫'}</td>`;
        });
        
        tableHTML += `</tr>`;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// Render lịch sử giao dịch
function renderHistory() {
    const container = document.getElementById('historyList');
    const typeFilter = document.getElementById('historyFilter').value;
    const memberFilter = document.getElementById('memberFilter').value;
    
    let transactions = [...appData.transactions];
    
    // Lọc theo loại giao dịch
    if (typeFilter !== 'all') {
        transactions = transactions.filter(t => t.type === typeFilter);
    }
    
    // Lọc theo thành viên
    if (memberFilter !== 'all') {
        transactions = transactions.filter(t => t.memberId === parseInt(memberFilter));
    }
    
    // Sắp xếp theo thời gian mới nhất
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
        container.innerHTML = '<p style="color: #999;">Chưa có giao dịch nào.</p>';
        return;
    }
    
    container.innerHTML = transactions.map(t => {
        let icon = '💰';
        let label = 'Góp vốn';
        let sign = '+';
        let colorClass = 'positive';
        
        if (t.type === 'withdraw') {
            icon = '💸';
            label = 'Rút vốn';
            sign = '-';
            colorClass = 'negative';
        } else if (t.type === 'repay') {
            icon = '↩️';
            label = 'Trả nợ';
            sign = '+';
            colorClass = 'positive';
        }
        
        return `
            <div class="history-item ${t.type}">
                <div class="history-header">
                    <span class="history-type ${t.type}">
                        ${icon} ${label}
                    </span>
                    <span>${formatDate(t.date)}</span>
                </div>
                <div class="history-details">
                    <strong>${t.memberName}</strong>
                    ${t.month ? ` - Tháng ${t.month}` : ''}
                </div>
                <div class="history-amount ${colorClass}">
                    ${sign} ${formatMoney(t.amount)}
                </div>
                ${t.note ? `<div style="color: #666; font-size: 0.9em; margin-top: 5px;">${t.note}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Cập nhật dropdown chọn thành viên cho rút vốn
function updateWithdrawMemberSelect() {
    const select = document.getElementById('withdrawMember');
    select.innerHTML = '<option value="">-- Chọn thành viên --</option>' + 
        appData.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// Cập nhật dropdown chọn thành viên cho góp vốn
function updateContributeMemberSelect() {
    const select = document.getElementById('contributeMember');
    select.innerHTML = '<option value="all">Tất cả thành viên</option>' + 
        appData.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// Sửa tên thành viên
function editMemberName(memberId) {
    if (!requireAuth()) return;
    
    console.log('editMemberName called with ID:', memberId, 'type:', typeof memberId);
    const member = appData.members.find(m => m.id == memberId); // Dùng == để so sánh loose
    console.log('Found member:', member);
    if (!member) {
        alert('Không tìm thấy thành viên!');
        return;
    }
    
    const newName = prompt('Nhập tên mới:', member.name);
    console.log('New name entered:', newName);
    if (!newName || newName.trim() === '') return;
    
    const trimmedName = newName.trim();
    if (trimmedName === member.name) return;
    
    // Cập nhật tên trong danh sách thành viên
    member.name = trimmedName;
    
    // Cập nhật tên trong tất cả giao dịch
    appData.transactions.forEach(t => {
        if (t.memberId === memberId) {
            t.memberName = trimmedName;
        }
    });
    
    markAsChanged();
    renderMembers();
    updateWithdrawMemberSelect();
    updateContributeMemberSelect();
    updateMemberFilter();
    renderSummary();
    renderHistory();
    showNotification('Đã cập nhật tên thành viên!', 'success');
}

// Hàm chỉnh sửa ngày tham gia của thành viên
function editMemberJoinDate(memberId) {
    if (!requireAuth()) return;
    
    const member = appData.members.find(m => m.id == memberId);
    if (!member) {
        alert('Không tìm thấy thành viên!');
        return;
    }
    
    // Lấy ngày hiện tại hoặc ngày tham gia hiện có (định dạng YYYY-MM-DD)
    const currentDate = member.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    const newDate = prompt('Nhập ngày tham gia (định dạng: YYYY-MM-DD):', currentDate);
    if (!newDate) return;
    
    // Kiểm tra định dạng ngày
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('Định dạng ngày không hợp lệ! Vui lòng nhập theo dạng YYYY-MM-DD');
        return;
    }
    
    // Kiểm tra xem có phải là ngày hợp lệ
    const dateObj = new Date(newDate);
    if (isNaN(dateObj.getTime())) {
        alert('Ngày không hợp lệ!');
        return;
    }
    
    if (newDate === currentDate) return;
    
    // Cập nhật ngày tham gia
    member.joinDate = newDate;
    
    markAsChanged();
    renderMembers();
    renderSummary();
    renderHistory();
    showNotification(`Đã cập nhật ngày tham gia cho ${member.name}!`, 'success');
}

// Cập nhật dropdown lọc thành viên trong lịch sử
function updateMemberFilter() {
    const select = document.getElementById('memberFilter');
    select.innerHTML = '<option value="all">Tất cả thành viên</option>' + 
        appData.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}

// Xuất dữ liệu
function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `du-lieu-gop-von-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    showNotification('Đã xuất dữ liệu!', 'success');
}

// Nhập dữ liệu
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('Bạn có chắc muốn nhập dữ liệu này? Dữ liệu hiện tại sẽ bị thay thế.')) {
                    appData = data;
                    saveData();
                    initApp();
                    showNotification('Đã nhập dữ liệu thành công!', 'success');
                }
            } catch (error) {
                showNotification('Lỗi: File không hợp lệ!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Reset dữ liệu
function resetData() {
    if (confirm('BẠN CÓ CHẮC MUỐN XÓA TẤT CẢ DỮ LIỆU?\nHành động này không thể hoàn tác!')) {
        if (confirm('Xác nhận lần cuối: Xóa tất cả dữ liệu?')) {
            localStorage.removeItem('familyFundData');
            appData = {
                settings: { monthlyAmount: 200000 },
                members: [],
                transactions: []
            };
            initApp();
            showNotification('Đã reset tất cả dữ liệu!', 'success');
        }
    }
}

// Hàm format tiền tệ
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm format ngày
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Hiển thị thông báo
function showNotification(message, type = 'info') {
    // Tạo element thông báo
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#38ef7d' : type === 'error' ? '#eb3349' : '#667eea'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
    `;
    
    document.body.appendChild(notification);
    
    // Tự động xóa sau 3 giây
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Thêm CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Authentication Functions
function checkAuthStatus() {
    const savedAuth = localStorage.getItem('isAuthenticated');
    if (savedAuth === 'true') {
        isAuthenticated = true;
    }
}

function showLoginDialog() {
    const password = prompt('Nhập mật khẩu để chỉnh sửa:');
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem('isAuthenticated', 'true');
        updateUIBasedOnAuth();
        showNotification('Đăng nhập thành công! Bạn có thể chỉnh sửa.', 'success');
    } else if (password !== null) {
        showNotification('Mật khẩu không đúng!', 'error');
    }
}

function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    updateUIBasedOnAuth();
    showNotification('Đã đăng xuất! Bạn chỉ có thể xem.', 'info');
}

function updateUIBasedOnAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (isAuthenticated) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
    }
    
    // Ẩn/hiện các phần chỉnh sửa
    const editableSections = [
        '.settings-section',
        '.members-section .add-member-form',
        '.actions-section',
        '.member-card .delete-btn',
        '.member-card .edit-btn'
    ];
    
    editableSections.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (isAuthenticated) {
                el.style.display = '';
                el.style.pointerEvents = 'auto';
                el.style.opacity = '1';
            } else {
                if (selector === '.settings-section' || selector === '.actions-section' || selector === '.members-section .add-member-form') {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'none';
                }
            }
        });
    });
}

function requireAuth(action) {
    if (!isAuthenticated) {
        showNotification('Vui lòng đăng nhập để thực hiện chỉnh sửa!', 'error');
        return false;
    }
    return true;
}

// Dashboard Functions - Display Fund Summary
function renderDashboard() {
    const container = document.getElementById('dashboardCards');
    if (!container) return;
    
    // Tính tổng tiền đã góp và tiền thực tế
    const totalContributed = appData.transactions
        .filter(t => t.type === 'contribute')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = appData.transactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalRepaid = appData.transactions
        .filter(t => t.type === 'repay')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const debtRemaining = Math.max(0, totalWithdrawn - totalRepaid);
    const actualMoney = totalContributed - debtRemaining;
    
    // Hiển thị 3 cards tổng tiền
    container.innerHTML = `
        <div class="fund-card total-contributed">
            <div class="fund-icon">💰</div>
            <div class="fund-label">Tổng Tiền Đã Góp</div>
            <div class="fund-amount">${formatMoney(totalContributed)}</div>
            <div class="fund-note">Tổng góp vốn qua các tháng</div>
        </div>
        <div class="fund-card total-withdrawn">
            <div class="fund-icon">💸</div>
            <div class="fund-label">Tổng Tiền Đã Rút</div>
            <div class="fund-amount">${debtRemaining > 0 ? formatMoney(debtRemaining) : '0 ₫'}</div>
            <div class="fund-note">${debtRemaining > 0 ? 'Còn nợ chưa trả' : 'Đã trả hết nợ'}</div>
        </div>
        <div class="fund-card actual-money">
            <div class="fund-icon">🏦</div>
            <div class="fund-label">Tiền Thực Tế Trong Quỹ</div>
            <div class="fund-amount">${formatMoney(actualMoney)}</div>
            <div class="fund-note">Tiền còn lại sau khi trừ rút</div>
        </div>
    `;
}

// Export to Excel with Beautiful Formatting
function exportToExcel() {
    if (!window.XLSX) {
        showNotification('Đang tải thư viện Excel...', 'info');
        return;
    }
    
    // Tạo workbook
    const wb = XLSX.utils.book_new();
    
    // Tính tổng cho summary
    const totalContributed = appData.transactions
        .filter(t => t.type === 'contribute')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawn = appData.transactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalRepaid = appData.transactions
        .filter(t => t.type === 'repay')
        .reduce((sum, t) => sum + t.amount, 0);
    const debtRemaining = Math.max(0, totalWithdrawn - totalRepaid);
    const actualBalance = totalContributed - debtRemaining;
    
    // === SHEET 1: TỔNG QUAN ===
    const summaryData = [
        ['BÁO CÁO QUỸ GIA ĐÌNH'],
        [`Ngày xuất: ${formatDate(new Date().toISOString())}`],
        [],
        ['TỔNG QUAN TÀI CHÍNH'],
        ['Chỉ Tiêu', 'Số Tiền (VNĐ)'],
        ['💰 Tổng Tiền Đã Góp', totalContributed],
        ['💸 Tổng Tiền Đã Rút', totalWithdrawn],
        ['💰 Tổng Đã Trả Nợ', totalRepaid],
        ['⚠️ Nợ Còn Lại', debtRemaining],
        ['✅ Số Dư Thực Tế', actualBalance],
        [],
        ['THÔNG TIN CHUNG'],
        ['Số thành viên', appData.members.length],
        ['Tổng số giao dịch', appData.transactions.length],
    ];
    
    const ws0 = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Định dạng độ rộng cột
    ws0['!cols'] = [
        { wch: 25 },
        { wch: 20 }
    ];
    
    // Merge cells cho tiêu đề
    ws0['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Tiêu đề chính
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Ngày
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Tổng quan
        { s: { r: 11, c: 0 }, e: { r: 11, c: 1 } }  // Thông tin chung
    ];
    
    XLSX.utils.book_append_sheet(wb, ws0, 'Tổng Quan');
    
    // === SHEET 2: THÀNH VIÊN ===
    const membersData = [
        ['DANH SÁCH THÀNH VIÊN'],
        [],
        ['STT', 'Tên', 'Ngày Tham Gia', 'Tổng Góp (VNĐ)', 'Tổng Rút (VNĐ)', 'Tổng Trả Nợ (VNĐ)', 'Còn Nợ (VNĐ)'],
        ...appData.members.map((member, idx) => {
            const contributed = appData.transactions
                .filter(t => t.memberId === member.id && t.type === 'contribute')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const withdrawn = appData.transactions
                .filter(t => t.memberId === member.id && t.type === 'withdraw')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const repaid = appData.transactions
                .filter(t => t.memberId === member.id && t.type === 'repay')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const debt = Math.max(0, withdrawn - repaid);
            
            return [
                idx + 1,
                member.name,
                formatDate(member.joinDate),
                contributed,
                withdrawn,
                repaid,
                debt
            ];
        }),
        [],
        ['TỔNG CỘNG', '', '', 
            appData.members.reduce((sum, m) => {
                return sum + appData.transactions
                    .filter(t => t.memberId === m.id && t.type === 'contribute')
                    .reduce((s, t) => s + t.amount, 0);
            }, 0),
            appData.members.reduce((sum, m) => {
                return sum + appData.transactions
                    .filter(t => t.memberId === m.id && t.type === 'withdraw')
                    .reduce((s, t) => s + t.amount, 0);
            }, 0),
            appData.members.reduce((sum, m) => {
                return sum + appData.transactions
                    .filter(t => t.memberId === m.id && t.type === 'repay')
                    .reduce((s, t) => s + t.amount, 0);
            }, 0),
            appData.members.reduce((sum, m) => {
                const withdrawn = appData.transactions
                    .filter(t => t.memberId === m.id && t.type === 'withdraw')
                    .reduce((s, t) => s + t.amount, 0);
                const repaid = appData.transactions
                    .filter(t => t.memberId === m.id && t.type === 'repay')
                    .reduce((s, t) => s + t.amount, 0);
                return sum + Math.max(0, withdrawn - repaid);
            }, 0)
        ]
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(membersData);
    
    // Định dạng độ rộng cột
    ws1['!cols'] = [
        { wch: 6 },   // STT
        { wch: 20 },  // Tên
        { wch: 15 },  // Ngày
        { wch: 18 },  // Tổng góp
        { wch: 18 },  // Tổng rút
        { wch: 18 },  // Trả nợ
        { wch: 18 }   // Còn nợ
    ];
    
    // Merge cell cho tiêu đề
    ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Thành Viên');
    
    // === SHEET 3: LỊCH SỬ GIAO DỊCH ===
    const typeNames = {
        contribute: 'Góp vốn',
        withdraw: 'Rút vốn',
        repay: 'Trả nợ'
    };
    
    const txData = [
        ['LỊCH SỬ GIAO DỊCH'],
        [],
        ['STT', 'Ngày', 'Thành Viên', 'Loại', 'Số Tiền (VNĐ)', 'Ghi Chú'],
        ...appData.transactions.map((tx, idx) => [
            idx + 1,
            formatDate(tx.date),
            tx.memberName,
            typeNames[tx.type] || tx.type,
            tx.amount,
            tx.note || ''
        ]),
        [],
        ['TỔNG GIAO DỊCH', appData.transactions.length, '', 
            'Tổng tiền:', 
            appData.transactions.reduce((sum, t) => sum + t.amount, 0),
            ''
        ]
    ];
    
    const ws2 = XLSX.utils.aoa_to_sheet(txData);
    
    // Định dạng độ rộng cột
    ws2['!cols'] = [
        { wch: 6 },   // STT
        { wch: 12 },  // Ngày
        { wch: 20 },  // Thành viên
        { wch: 12 },  // Loại
        { wch: 18 },  // Số tiền
        { wch: 40 }   // Ghi chú
    ];
    
    // Merge cell cho tiêu đề
    ws2['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Giao Dịch');
    
    // Xuất file
    const fileName = `BaoCaoGopVon_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification('✅ Đã xuất báo cáo Excel với định dạng đẹp!', 'success');
}

// Print PDF
function printReport() {
    // Set print date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('vi-VN');
    
    document.getElementById('printDate').textContent = dateStr;
    document.getElementById('printDateTime').textContent = `${dateStr} lúc ${timeStr}`;
    document.getElementById('printMemberCount').textContent = appData.members.length + ' người';
    document.getElementById('printTransactionCount').textContent = appData.transactions.length + ' giao dịch';
    
    // Calculate totals
    const totalContributed = appData.transactions
        .filter(t => t.type === 'contribute')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = appData.transactions
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalRepaid = appData.transactions
        .filter(t => t.type === 'repay')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDebt = appData.members.reduce((sum, m) => sum + m.debt, 0);
    const actualBalance = totalContributed - totalWithdrawn + totalRepaid;
    
    // Create summary grid
    const summaryData = [
        { icon: '💵', label: 'Tổng Góp Vốn', value: totalContributed, color: '#4CAF50' },
        { icon: '💸', label: 'Tổng Rút Vốn', value: totalWithdrawn, color: '#f44336' },
        { icon: '💰', label: 'Tiền Trả Nợ', value: totalRepaid, color: '#2196F3' },
        { icon: '⚠️', label: 'Nợ Còn Lại', value: totalDebt, color: '#FF9800' },
        { icon: '✅', label: 'Số Dư Thực Tế', value: actualBalance, color: '#009688' }
    ];
    
    let summaryHtml = summaryData.map(item => `
        <div class="summary-card" style="border-left: 4px solid ${item.color}">
            <div class="summary-icon">${item.icon}</div>
            <div class="summary-content">
                <div class="summary-label">${item.label}</div>
                <div class="summary-value" style="color: ${item.color}">${formatMoney(item.value)} VNĐ</div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('printSummaryGrid').innerHTML = summaryHtml;
    
    // Create member details
    let memberHtml = appData.members.map((m, idx) => {
        const contributed = appData.transactions
            .filter(t => t.type === 'contribute' && t.memberId === m.id)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const withdrawn = appData.transactions
            .filter(t => t.type === 'withdraw' && t.memberId === m.id)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const repaid = appData.transactions
            .filter(t => t.type === 'repay' && t.memberId === m.id)
            .reduce((sum, t) => sum + t.amount, 0);
        
        return `
            <div class="member-detail-card">
                <div class="member-number">${idx + 1}</div>
                <div class="member-info">
                    <div class="member-name">${m.name}</div>
                    <div class="member-stats">
                        <div class="stat-item">
                            <span class="stat-label">Đã góp:</span>
                            <span class="stat-value positive">${formatMoney(contributed)} VNĐ</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Đã rút:</span>
                            <span class="stat-value negative">${formatMoney(withdrawn)} VNĐ</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Đã trả nợ:</span>
                            <span class="stat-value info">${formatMoney(repaid)} VNĐ</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Nợ còn:</span>
                            <span class="stat-value ${m.debt > 0 ? 'warning' : 'success'}">${formatMoney(m.debt)} VNĐ</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('printMemberDetails').innerHTML = memberHtml;
    
    // Trigger print
    window.print();
    showNotification('Đang chuẩn bị in...', 'info');
}

// Khởi chạy ứng dụng khi trang load xong
window.addEventListener('DOMContentLoaded', initApp);
