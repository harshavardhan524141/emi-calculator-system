/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EMI Calculator System - Software Engineering Mini Project
 * Logical Classes:
 * 1. User
 * 2. Validator
 * 3. Loan
 * 4. EMICalculator
 * 5. Result
 */

import Chart from 'chart.js/auto';

// ============================================================================
// HELPER UTILITIES: INDIAN CURRENCY FORMATTER
// ============================================================================

/**
 * Formats a numeric value into the Indian numbering system with Rupee symbol (₹).
 * Handles Lakhs (1,00,000) and Crores (1,00,00,000).
 * 
 * @param {number} amount
 * @param {boolean} includeDecimals
 * @returns {string} Formatted Indian Rupee string (e.g. ₹5,00,000.00)
 */
export function formatINR(amount, includeDecimals = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeDecimals ? '₹0.00' : '₹0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const fixed = absAmount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  // Format Indian integer numbering
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  let formattedInteger = lastThree;
  if (otherNumbers !== '') {
    formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const formatted = includeDecimals
    ? `₹${formattedInteger}.${decimalPart}`
    : `₹${formattedInteger}`;

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converts a number to readable Indian text (e.g. 5 Lakhs, 1.5 Crores)
 * @param {number} num 
 * @returns {string}
 */
export function formatIndianWords(num) {
  if (!num || isNaN(num) || num <= 0) return '';
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2);
    return `${cr.replace(/\.00$/, '')} Crore${cr > 1 ? 's' : ''}`;
  }
  if (num >= 100000) {
    const lakh = (num / 100000).toFixed(2);
    return `${lakh.replace(/\.00$/, '')} Lakh${lakh > 1 ? 's' : ''}`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1);
    return `${k.replace(/\.0$/, '')} Thousand`;
  }
  return '';
}

// ============================================================================
// CLASS 2: VALIDATOR
// Responsibilities:
// - Validate loan amount
// - Validate interest rate
// - Validate loan tenure
// - Return validation errors
// ============================================================================
export class Validator {
  /**
   * Validates the loan principal amount.
   * @param {string|number} amount
   * @returns {string|null} Error message or null if valid.
   */
  validateLoanAmount(amount) {
    if (amount === '' || amount === null || amount === undefined) {
      return 'Please enter a valid loan amount.';
    }
    const num = Number(amount);
    if (isNaN(num)) {
      return 'Loan amount must be a valid numeric value.';
    }
    if (num <= 0) {
      return 'Loan amount must be greater than zero.';
    }
    if (num > 1000000000) {
      return 'Loan amount cannot exceed ₹100 Crores.';
    }
    return null;
  }

  /**
   * Validates the annual interest rate.
   * @param {string|number} rate
   * @returns {string|null} Error message or null if valid.
   */
  validateInterestRate(rate) {
    if (rate === '' || rate === null || rate === undefined) {
      return 'Please enter an annual interest rate.';
    }
    const num = Number(rate);
    if (isNaN(num)) {
      return 'Interest rate must be a valid numeric value.';
    }
    if (num < 0) {
      return 'Interest rate cannot be negative.';
    }
    if (num > 100) {
      return 'Interest rate cannot exceed 100% per annum.';
    }
    return null;
  }

  /**
   * Validates the loan tenure.
   * @param {string|number} tenure
   * @param {string} tenureUnit - 'years' or 'months'
   * @returns {string|null} Error message or null if valid.
   */
  validateLoanTenure(tenure, tenureUnit = 'years') {
    if (tenure === '' || tenure === null || tenure === undefined) {
      return 'Please enter a valid loan tenure.';
    }
    const num = Number(tenure);
    if (isNaN(num)) {
      return 'Loan tenure must be a valid numeric value.';
    }
    if (num <= 0) {
      return 'Loan tenure must be greater than zero.';
    }
    const totalMonths = tenureUnit === 'years' ? num * 12 : num;
    if (totalMonths > 600) {
      return 'Loan tenure cannot exceed 50 years (600 months).';
    }
    return null;
  }

  /**
   * Performs validation across all input fields.
   * @param {string|number} amount
   * @param {string|number} rate
   * @param {string|number} tenure
   * @param {string} tenureUnit
   * @returns {{isValid: boolean, errors: Object<string, string>}}
   */
  validateAllInputs(amount, rate, tenure, tenureUnit = 'years') {
    const errors = {};
    const amountError = this.validateLoanAmount(amount);
    if (amountError) errors.loanAmount = amountError;

    const rateError = this.validateInterestRate(rate);
    if (rateError) errors.interestRate = rateError;

    const tenureError = this.validateLoanTenure(tenure, tenureUnit);
    if (tenureError) errors.loanTenure = tenureError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// ============================================================================
// CLASS 3: LOAN
// Responsibilities:
// - Store loan information
// - Calculate monthly interest rate
// - Calculate total number of installments
// ============================================================================
export class Loan {
  /**
   * @param {number} principal
   * @param {number} annualInterestRate
   * @param {number} tenure
   * @param {string} tenureUnit - 'years' or 'months'
   */
  constructor(principal, annualInterestRate, tenure, tenureUnit = 'years') {
    this.principal = Number(principal);
    this.annualInterestRate = Number(annualInterestRate);
    this.tenure = Number(tenure);
    this.tenureUnit = tenureUnit;
    this.monthlyInterestRate = this.calculateMonthlyRate();
    this.totalMonths = this.calculateTotalMonths();
  }

  /**
   * Converts annual interest rate to monthly rate: R = Annual / (12 * 100)
   * @returns {number}
   */
  calculateMonthlyRate() {
    return this.annualInterestRate / (12 * 100);
  }

  /**
   * Calculates total months: N = Tenure * 12 (if years) or Tenure (if months)
   * @returns {number}
   */
  calculateTotalMonths() {
    return this.tenureUnit === 'years'
      ? Math.round(this.tenure * 12)
      : Math.round(this.tenure);
  }

  /**
   * Returns a copy of the loan details object.
   * @returns {Object}
   */
  getLoanDetails() {
    return {
      principal: this.principal,
      annualInterestRate: this.annualInterestRate,
      tenure: this.tenure,
      tenureUnit: this.tenureUnit,
      monthlyInterestRate: this.monthlyInterestRate,
      totalMonths: this.totalMonths
    };
  }
}

// ============================================================================
// CLASS 4: EMICALCULATOR
// Responsibilities:
// - Perform EMI calculations
// - Calculate total interest
// - Calculate total payment
// - Generate the amortization schedule
// ============================================================================
export class EMICalculator {
  /**
   * Standard EMI Formula:
   * EMI = P * R * (1 + R)^N / ((1 + R)^N - 1)
   * Special case: If R == 0, EMI = P / N
   * 
   * @param {Loan} loan
   * @returns {number} Full precision EMI
   */
  calculateEMI(loan) {
    const P = loan.principal;
    const R = loan.monthlyInterestRate;
    const N = loan.totalMonths;

    if (N <= 0) return 0;
    if (R === 0) {
      return P / N;
    }

    const factor = Math.pow(1 + R, N);
    const emi = (P * R * factor) / (factor - 1);
    return emi;
  }

  /**
   * Total Payment = Monthly EMI * Total Months
   * @param {Loan} loan
   * @param {number} emi
   * @returns {number}
   */
  calculateTotalPayment(loan, emi) {
    return emi * loan.totalMonths;
  }

  /**
   * Total Interest = Total Payment - Principal
   * @param {Loan} loan
   * @param {number} emi
   * @returns {number}
   */
  calculateTotalInterest(loan, emi) {
    const totalPayment = this.calculateTotalPayment(loan, emi);
    const interest = totalPayment - loan.principal;
    return Math.max(0, interest);
  }

  /**
   * Generates full monthly repayment schedule with exact principal, interest,
   * opening balance, and remaining balance for each month.
   * Adjusts the final installment to ensure zero balance and sum of principal equals original P.
   * 
   * @param {Loan} loan
   * @param {number} emi
   * @returns {Array<Object>}
   */
  generateAmortizationSchedule(loan, emi) {
    const schedule = [];
    let currentBalance = loan.principal;
    const R = loan.monthlyInterestRate;
    const N = loan.totalMonths;

    for (let month = 1; month <= N; month++) {
      const openingBalance = currentBalance;
      let interestPaid = R === 0 ? 0 : currentBalance * R;
      let principalPaid = emi - interestPaid;
      let remainingBalance = currentBalance - principalPaid;
      let currentMonthEMI = emi;

      // Final month adjustment or early float precision convergence
      if (month === N || remainingBalance < 0 || Math.abs(remainingBalance) < 0.05) {
        principalPaid = openingBalance;
        remainingBalance = 0;
        currentMonthEMI = principalPaid + interestPaid;
      }

      schedule.push({
        monthNumber: month,
        openingBalance: Number(openingBalance.toFixed(2)),
        emiAmount: Number(currentMonthEMI.toFixed(2)),
        principalPaid: Number(principalPaid.toFixed(2)),
        interestPaid: Number(interestPaid.toFixed(2)),
        remainingBalance: Number(remainingBalance.toFixed(2))
      });

      currentBalance = remainingBalance;
    }

    return schedule;
  }
}

// ============================================================================
// CLASS 5: RESULT
// Responsibilities:
// - Store calculation results
// - Display EMI information
// - Display principal and interest breakdown
// - Display the amortization schedule
// ============================================================================
export class Result {
  constructor() {
    this.monthlyEMI = 0;
    this.principalAmount = 0;
    this.totalInterest = 0;
    this.totalPayment = 0;
    this.amortizationSchedule = [];
    this.chartInstance = null;
    this.currentPage = 1;
    this.pageSize = 12; // 1 year per page by default
    this.searchQuery = '';
  }

  /**
   * Updates internal result attributes and coordinates UI updates.
   * @param {Object} data
   */
  setResultData(data) {
    this.monthlyEMI = data.monthlyEMI;
    this.principalAmount = data.principalAmount;
    this.totalInterest = data.totalInterest;
    this.totalPayment = data.totalPayment;
    this.amortizationSchedule = data.amortizationSchedule || [];
    this.currentPage = 1;
  }

  /**
   * Displays EMI information across cards.
   */
  displayResult() {
    const emiEl = document.getElementById('result-monthly-emi');
    const principalEl = document.getElementById('result-principal');
    const interestEl = document.getElementById('result-interest');
    const totalEl = document.getElementById('result-total');
    const badgeEl = document.getElementById('result-tenure-badge');
    const ratioEl = document.getElementById('result-ratio-badge');
    const centerRatioEl = document.getElementById('chart-center-ratio');

    if (emiEl) emiEl.textContent = formatINR(this.monthlyEMI);
    if (principalEl) principalEl.textContent = formatINR(this.principalAmount);
    if (interestEl) interestEl.textContent = formatINR(this.totalInterest);
    if (totalEl) totalEl.textContent = formatINR(this.totalPayment);

    const total = this.totalPayment || 1;
    const principalPct = ((this.principalAmount / total) * 100).toFixed(1);
    const interestPct = ((this.totalInterest / total) * 100).toFixed(1);

    const principalPctEl = document.getElementById('metric-principal-pct');
    const interestPctEl = document.getElementById('metric-interest-pct');
    if (principalPctEl) principalPctEl.textContent = `${principalPct}% of total`;
    if (interestPctEl) interestPctEl.textContent = `${interestPct}% of total`;

    if (badgeEl) {
      badgeEl.textContent = `${this.amortizationSchedule.length} Months Total`;
    }

    if (ratioEl) {
      ratioEl.textContent = `Principal: ${principalPct}% | Interest: ${interestPct}%`;
    }

    if (centerRatioEl) {
      centerRatioEl.textContent = `${principalPct}%`;
    }

    // Update custom legend
    const legendPrincipalVal = document.getElementById('legend-principal-val');
    const legendPrincipalPct = document.getElementById('legend-principal-pct');
    const legendInterestVal = document.getElementById('legend-interest-val');
    const legendInterestPct = document.getElementById('legend-interest-pct');

    if (legendPrincipalVal) legendPrincipalVal.textContent = formatINR(this.principalAmount);
    if (legendPrincipalPct) legendPrincipalPct.textContent = `${principalPct}%`;
    if (legendInterestVal) legendInterestVal.textContent = formatINR(this.totalInterest);
    if (legendInterestPct) legendInterestPct.textContent = `${interestPct}%`;

    // Render chart and schedule
    this.displayChart(this.principalAmount, this.totalInterest);
    this.displaySchedule();
  }

  /**
   * Displays or updates the Chart.js doughnut chart.
   * @param {number} principal
   * @param {number} interest
   */
  displayChart(principal, interest) {
    const canvas = document.getElementById('emiChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal Amount', 'Total Interest'],
        datasets: [
          {
            data: [principal, interest],
            backgroundColor: ['#1e3a8a', '#d97706'],
            hoverBackgroundColor: ['#2563eb', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            display: false // Managed with accessible HTML custom legend
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            boxPadding: 6,
            cornerRadius: 8,
            titleFont: { family: 'Inter', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 13 },
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${label}: ${formatINR(value)} (${pct}%)`;
              }
            }
          }
        },
        animation: {
          duration: 600,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  /**
   * Displays the monthly amortization schedule table with pagination and filtering.
   */
  displaySchedule() {
    const tbody = document.getElementById('amortization-tbody');
    const tfoot = document.getElementById('amortization-tfoot');
    const countInfo = document.getElementById('schedule-count-info');
    const pageNav = document.getElementById('schedule-pagination-nav');

    if (!tbody) return;

    tbody.innerHTML = '';

    if (!this.amortizationSchedule || this.amortizationSchedule.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">No schedule generated. Please calculate an EMI above.</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      if (countInfo) countInfo.textContent = 'Showing 0 of 0 months';
      if (pageNav) pageNav.innerHTML = '';
      return;
    }

    // Filter schedule if search query is provided
    let filtered = this.amortizationSchedule;
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const q = this.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => {
        return (
          item.monthNumber.toString().includes(q) ||
          `month ${item.monthNumber}`.includes(q)
        );
      });
    }

    const totalRecords = filtered.length;
    let totalPages = Math.ceil(totalRecords / this.pageSize);
    if (totalPages < 1) totalPages = 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalRecords);
    const pageRecords = filtered.slice(startIndex, endIndex);

    // Populate rows
    pageRecords.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-center"><span class="month-badge">Month ${row.monthNumber}</span></td>
        <td>${formatINR(row.openingBalance)}</td>
        <td style="font-weight: 600; color: #047857;">${formatINR(row.emiAmount)}</td>
        <td style="color: #1e3a8a; font-weight: 500;">${formatINR(row.principalPaid)}</td>
        <td style="color: #b45309; font-weight: 500;">${formatINR(row.interestPaid)}</td>
        <td style="font-weight: 600;">${formatINR(row.remainingBalance)}</td>
      `;
      tbody.appendChild(tr);
    });

    // Populate table footer totals
    if (tfoot) {
      const sumPrincipal = this.amortizationSchedule.reduce((acc, cur) => acc + cur.principalPaid, 0);
      const sumInterest = this.amortizationSchedule.reduce((acc, cur) => acc + cur.interestPaid, 0);
      const sumTotal = sumPrincipal + sumInterest;

      tfoot.innerHTML = `
        <tr>
          <td class="col-center"><strong>Total (${this.amortizationSchedule.length} M)</strong></td>
          <td>-</td>
          <td style="color: #047857;"><strong>${formatINR(sumTotal)}</strong></td>
          <td style="color: #1e3a8a;"><strong>${formatINR(sumPrincipal)}</strong></td>
          <td style="color: #b45309;"><strong>${formatINR(sumInterest)}</strong></td>
          <td><strong>₹0.00</strong></td>
        </tr>
      `;
    }

    // Update pagination status
    if (countInfo) {
      if (totalRecords === 0) {
        countInfo.textContent = 'No matching months found.';
      } else {
        countInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalRecords} months`;
      }
    }

    // Render pagination controls
    if (pageNav) {
      pageNav.innerHTML = '';
      if (totalPages > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.textContent = '‹';
        prevBtn.title = 'Previous Page';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.displaySchedule();
          }
        };
        pageNav.appendChild(prevBtn);

        // Dynamic page buttons window
        const maxButtons = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) {
          startPage = Math.max(1, endPage - maxButtons + 1);
        }

        for (let p = startPage; p <= endPage; p++) {
          const btn = document.createElement('button');
          btn.className = `page-btn ${p === this.currentPage ? 'active' : ''}`;
          btn.textContent = p.toString();
          btn.onclick = () => {
            this.currentPage = p;
            this.displaySchedule();
          };
          pageNav.appendChild(btn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.textContent = '›';
        nextBtn.title = 'Next Page';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => {
          if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displaySchedule();
          }
        };
        pageNav.appendChild(nextBtn);
      }
    }
  }

  /**
   * Exports the entire monthly amortization schedule to a CSV file.
   */
  exportToCSV() {
    if (!this.amortizationSchedule || this.amortizationSchedule.length === 0) {
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month Number,Opening Balance (INR),EMI Amount (INR),Principal Paid (INR),Interest Paid (INR),Remaining Balance (INR)\n";

    this.amortizationSchedule.forEach(row => {
      csvContent += `${row.monthNumber},${row.openingBalance},${row.emiAmount},${row.principalPaid},${row.interestPaid},${row.remainingBalance}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EMI_Amortization_Schedule_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Clears results and resets UI views to default state.
   */
  clearResult() {
    this.monthlyEMI = 0;
    this.principalAmount = 0;
    this.totalInterest = 0;
    this.totalPayment = 0;
    this.amortizationSchedule = [];
    this.currentPage = 1;
    this.searchQuery = '';

    const emiEl = document.getElementById('result-monthly-emi');
    const principalEl = document.getElementById('result-principal');
    const interestEl = document.getElementById('result-interest');
    const totalEl = document.getElementById('result-total');
    const badgeEl = document.getElementById('result-tenure-badge');
    const ratioEl = document.getElementById('result-ratio-badge');
    const centerRatioEl = document.getElementById('chart-center-ratio');

    if (emiEl) emiEl.textContent = '₹0.00';
    if (principalEl) principalEl.textContent = '₹0.00';
    if (interestEl) interestEl.textContent = '₹0.00';
    if (totalEl) totalEl.textContent = '₹0.00';
    if (badgeEl) badgeEl.textContent = '0 Months';
    if (ratioEl) ratioEl.textContent = 'Principal: 0% | Interest: 0%';
    if (centerRatioEl) centerRatioEl.textContent = '0%';

    const principalPctEl = document.getElementById('metric-principal-pct');
    const interestPctEl = document.getElementById('metric-interest-pct');
    if (principalPctEl) principalPctEl.textContent = '0% of total';
    if (interestPctEl) interestPctEl.textContent = '0% of total';

    const legendPrincipalVal = document.getElementById('legend-principal-val');
    const legendPrincipalPct = document.getElementById('legend-principal-pct');
    const legendInterestVal = document.getElementById('legend-interest-val');
    const legendInterestPct = document.getElementById('legend-interest-pct');

    if (legendPrincipalVal) legendPrincipalVal.textContent = '₹0.00';
    if (legendPrincipalPct) legendPrincipalPct.textContent = '0%';
    if (legendInterestVal) legendInterestVal.textContent = '₹0.00';
    if (legendInterestPct) legendInterestPct.textContent = '0%';

    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    this.displaySchedule();
  }
}

// ============================================================================
// CLASS 1: USER
// Responsibilities:
// - Enter loan details
// - Request EMI calculation
// - View calculation results
// - Adjust loan details
// - Reset the calculator
// ============================================================================
export class User {
  /**
   * @param {Validator} validator
   * @param {EMICalculator} calculator
   * @param {Result} result
   */
  constructor(validator, calculator, result) {
    this.validator = validator;
    this.calculator = calculator;
    this.result = result;

    this.loanAmount = 500000;
    this.interestRate = 10;
    this.loanTenure = 5;
    this.tenureUnit = 'years';

    this.activeLoan = null;
  }

  /**
   * Enters loan details into state.
   * @param {number|string} amount
   * @param {number|string} rate
   * @param {number|string} tenure
   * @param {string} tenureUnit
   */
  enterLoanDetails(amount, rate, tenure, tenureUnit = 'years') {
    this.loanAmount = amount;
    this.interestRate = rate;
    this.loanTenure = tenure;
    this.tenureUnit = tenureUnit;
  }

  /**
   * Primary action: validates inputs, creates Loan instance, performs calculation,
   * and delegates to Result component.
   * 
   * Interaction Sequence:
   * User -> EMICalculator -> Validator -> Loan -> EMICalculator -> Result -> User
   * 
   * @returns {boolean} Whether calculation succeeded.
   */
  calculateEMI() {
    this.clearValidationMessages();

    // 1. Validate inputs
    const validation = this.validator.validateAllInputs(
      this.loanAmount,
      this.interestRate,
      this.loanTenure,
      this.tenureUnit
    );

    if (!validation.isValid) {
      this.displayValidationErrors(validation.errors);
      return false;
    }

    // 2. Instantiate Loan
    const loan = new Loan(
      Number(this.loanAmount),
      Number(this.interestRate),
      Number(this.loanTenure),
      this.tenureUnit
    );
    this.activeLoan = loan;

    // 3. Perform EMI calculation
    const emi = this.calculator.calculateEMI(loan);
    const totalPayment = this.calculator.calculateTotalPayment(loan, emi);
    const totalInterest = this.calculator.calculateTotalInterest(loan, emi);
    const amortizationSchedule = this.calculator.generateAmortizationSchedule(loan, emi);

    // 4. Send calculation output to Result component
    this.result.setResultData({
      monthlyEMI: Number(emi.toFixed(2)),
      principalAmount: loan.principal,
      totalPayment: Number(totalPayment.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      amortizationSchedule: amortizationSchedule
    });

    // 5. View Result
    this.viewResult();
    return true;
  }

  /**
   * Displays the computed results.
   */
  viewResult() {
    this.result.displayResult();
  }

  /**
   * Resets all calculator fields and clears result views.
   */
  resetCalculator() {
    this.loanAmount = '';
    this.interestRate = '';
    this.loanTenure = '';
    this.tenureUnit = 'years';
    this.activeLoan = null;

    this.clearValidationMessages();

    // Reset Form Elements
    const amountInput = document.getElementById('loanAmount');
    const amountSlider = document.getElementById('loanAmountSlider');
    const amountWords = document.getElementById('loanAmountWords');

    const rateInput = document.getElementById('interestRate');
    const rateSlider = document.getElementById('interestRateSlider');

    const tenureInput = document.getElementById('loanTenure');
    const tenureSlider = document.getElementById('loanTenureSlider');

    if (amountInput) amountInput.value = '';
    if (amountSlider) amountSlider.value = '100000';
    if (amountWords) amountWords.textContent = '';

    if (rateInput) rateInput.value = '';
    if (rateSlider) rateSlider.value = '8.5';

    if (tenureInput) tenureInput.value = '';
    if (tenureSlider) tenureSlider.value = '5';

    this.setTenureUnit('years');
    this.result.clearResult();
  }

  /**
   * Toggles the tenure unit (years vs months) and updates slider boundaries.
   * @param {string} unit 
   */
  setTenureUnit(unit) {
    this.tenureUnit = unit;
    const btnYears = document.getElementById('toggle-years');
    const btnMonths = document.getElementById('toggle-months');
    const slider = document.getElementById('loanTenureSlider');
    const hint = document.getElementById('tenure-range-hint');

    if (btnYears && btnMonths) {
      if (unit === 'years') {
        btnYears.classList.add('active');
        btnMonths.classList.remove('active');
        if (slider) {
          slider.min = '1';
          slider.max = '30';
          slider.step = '1';
        }
        if (hint) hint.textContent = '1 to 30 Years';
      } else {
        btnMonths.classList.add('active');
        btnYears.classList.remove('active');
        if (slider) {
          slider.min = '6';
          slider.max = '360';
          slider.step = '1';
        }
        if (hint) hint.textContent = '6 to 360 Months';
      }
    }
  }

  /**
   * Displays inline validation messages near fields.
   * @param {Object} errors
   */
  displayValidationErrors(errors) {
    if (errors.loanAmount) {
      const errEl = document.getElementById('loanAmountError');
      const inputEl = document.getElementById('loanAmount');
      if (errEl) {
        errEl.textContent = errors.loanAmount;
        errEl.classList.add('visible');
      }
      if (inputEl) inputEl.classList.add('input-error');
    }

    if (errors.interestRate) {
      const errEl = document.getElementById('interestRateError');
      const inputEl = document.getElementById('interestRate');
      if (errEl) {
        errEl.textContent = errors.interestRate;
        errEl.classList.add('visible');
      }
      if (inputEl) inputEl.classList.add('input-error');
    }

    if (errors.loanTenure) {
      const errEl = document.getElementById('loanTenureError');
      const inputEl = document.getElementById('loanTenure');
      if (errEl) {
        errEl.textContent = errors.loanTenure;
        errEl.classList.add('visible');
      }
      if (inputEl) inputEl.classList.add('input-error');
    }
  }

  /**
   * Removes all inline validation messages and error borders.
   */
  clearValidationMessages() {
    ['loanAmount', 'interestRate', 'loanTenure'].forEach(id => {
      const errEl = document.getElementById(`${id}Error`);
      const inputEl = document.getElementById(id);
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
      }
      if (inputEl) {
        inputEl.classList.remove('input-error');
      }
    });
  }
}

// ============================================================================
// OFFICIAL TEST SUITE RUNNER
// Verifies all 6 test cases from specification
// ============================================================================
export const testCases = [
  {
    id: 1,
    name: 'Standard 1-Year Loan',
    principal: 100000,
    rate: 12,
    tenure: 1,
    unit: 'years',
    expectedEMI: 8884.88,
    expectValid: true,
    description: 'Loan ₹1,00,000 @ 12% for 1 Year. Expected EMI: ~₹8,884.88'
  },
  {
    id: 2,
    name: 'Standard 5-Year Loan',
    principal: 500000,
    rate: 10,
    tenure: 5,
    unit: 'years',
    expectedEMI: 10623.52,
    expectValid: true,
    description: 'Loan ₹5,00,000 @ 10% for 5 Years. Expected EMI: ~₹10,623.52'
  },
  {
    id: 3,
    name: 'Zero Percent Interest Loan',
    principal: 100000,
    rate: 0,
    tenure: 1,
    unit: 'years',
    expectedEMI: 8333.33,
    expectValid: true,
    description: 'Loan ₹1,00,000 @ 0% for 1 Year. Expected EMI: ~₹8,333.33'
  },
  {
    id: 4,
    name: 'Decimal Interest Rate Loan',
    principal: 200000,
    rate: 8.5,
    tenure: 3,
    unit: 'years',
    expectedEMI: 6313.51,
    expectValid: true,
    description: 'Loan ₹2,00,000 @ 8.5% for 3 Years. Formula EMI: ₹6,313.51 (~₹6,312.54)'
  },
  {
    id: 5,
    name: 'Empty Loan Amount Validation',
    principal: '',
    rate: 10,
    tenure: 5,
    unit: 'years',
    expectedEMI: null,
    expectValid: false,
    description: 'Empty Loan Amount. Expected: Validation Error, calculation blocked.'
  },
  {
    id: 6,
    name: 'Negative Interest Rate Validation',
    principal: 100000,
    rate: -5,
    tenure: 2,
    unit: 'years',
    expectedEMI: null,
    expectValid: false,
    description: 'Negative Interest Rate (-5%). Expected: Validation Error, calculation blocked.'
  }
];

export function runAutomatedTests(validator, calculator) {
  const results = [];

  testCases.forEach(tc => {
    const valResult = validator.validateAllInputs(tc.principal, tc.rate, tc.tenure, tc.unit);
    let passed = false;
    let actualEMI = null;
    let notes = '';

    if (tc.expectValid) {
      if (valResult.isValid) {
        const loan = new Loan(tc.principal, tc.rate, tc.tenure, tc.unit);
        const emi = calculator.calculateEMI(loan);
        actualEMI = Number(emi.toFixed(2));
        // Allow within 0.05 margin for standard floating point rounding
        const diff = Math.abs(actualEMI - tc.expectedEMI);
        passed = diff <= 0.05;
        notes = `Calculated EMI: ${formatINR(actualEMI)} (Diff: ₹${diff.toFixed(2)})`;
      } else {
        passed = false;
        notes = 'Unexpected validation failure.';
      }
    } else {
      // Expected invalid
      passed = !valResult.isValid;
      notes = `Caught Validation: ${Object.values(valResult.errors).join(', ')}`;
    }

    results.push({
      ...tc,
      passed,
      actualEMI,
      notes
    });
  });

  return results;
}

// ============================================================================
// APPLICATION BOOTSTRAPPER & EVENT WIRING
// ============================================================================

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
  const validator = new Validator();
  const calculator = new EMICalculator();
  const result = new Result();
  const user = new User(validator, calculator, result);

  // Expose to window for debugging or manual console verification
  window.emiApp = { validator, calculator, result, user };

  // DOM Elements
  const loanAmountInput = document.getElementById('loanAmount');
  const loanAmountSlider = document.getElementById('loanAmountSlider');
  const loanAmountWords = document.getElementById('loanAmountWords');

  const interestRateInput = document.getElementById('interestRate');
  const interestRateSlider = document.getElementById('interestRateSlider');

  const loanTenureInput = document.getElementById('loanTenure');
  const loanTenureSlider = document.getElementById('loanTenureSlider');

  const toggleYears = document.getElementById('toggle-years');
  const toggleMonths = document.getElementById('toggle-months');

  const calculateBtn = document.getElementById('calculateBtn');
  const resetBtn = document.getElementById('resetBtn');

  // Schedule elements
  const scheduleSearch = document.getElementById('scheduleSearch');
  const scheduleRowsSelect = document.getElementById('scheduleRowsSelect');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const printScheduleBtn = document.getElementById('printScheduleBtn');

  // Input sync with sliders & words
  function updateLoanAmountWords(val) {
    if (loanAmountWords) {
      const words = formatIndianWords(Number(val));
      loanAmountWords.textContent = words ? `(${words})` : '';
    }
  }

  if (loanAmountInput && loanAmountSlider) {
    loanAmountInput.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.loanAmount = val;
      if (!isNaN(val) && val > 0 && val <= 100000000) {
        loanAmountSlider.value = val;
      }
      updateLoanAmountWords(val);
    });

    loanAmountSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.loanAmount = val;
      loanAmountInput.value = val;
      updateLoanAmountWords(val);
    });
  }

  if (interestRateInput && interestRateSlider) {
    interestRateInput.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.interestRate = val;
      if (!isNaN(val) && val >= 0 && val <= 30) {
        interestRateSlider.value = val;
      }
    });

    interestRateSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.interestRate = val;
      interestRateInput.value = val;
    });
  }

  if (loanTenureInput && loanTenureSlider) {
    loanTenureInput.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.loanTenure = val;
      if (!isNaN(val) && val > 0 && val <= 360) {
        loanTenureSlider.value = val;
      }
    });

    loanTenureSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      user.clearValidationMessages();
      user.loanTenure = val;
      loanTenureInput.value = val;
    });
  }

  // Tenure Unit Selector Buttons
  if (toggleYears && toggleMonths) {
    toggleYears.addEventListener('click', () => {
      user.setTenureUnit('years');
      if (loanTenureInput && loanTenureInput.value > 30) {
        loanTenureInput.value = '5';
        if (loanTenureSlider) loanTenureSlider.value = '5';
        user.loanTenure = '5';
      }
    });

    toggleMonths.addEventListener('click', () => {
      user.setTenureUnit('months');
      if (loanTenureInput && loanTenureInput.value && loanTenureInput.value <= 30) {
        const months = Number(loanTenureInput.value) * 12;
        loanTenureInput.value = months.toString();
        if (loanTenureSlider) loanTenureSlider.value = months.toString();
        user.loanTenure = months.toString();
      }
    });
  }

  // Calculate Button
  if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
      user.enterLoanDetails(
        loanAmountInput.value,
        interestRateInput.value,
        loanTenureInput.value,
        user.tenureUnit
      );
      user.calculateEMI();
    });
  }

  // Reset Button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      user.resetCalculator();
    });
  }

  // Presets Bar (Home Loan, Car Loan, Personal Loan, Education Loan)
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const p = chip.dataset.principal;
      const r = chip.dataset.rate;
      const t = chip.dataset.tenure;
      const u = chip.dataset.unit || 'years';

      user.setTenureUnit(u);
      loanAmountInput.value = p;
      if (loanAmountSlider) loanAmountSlider.value = p;
      interestRateInput.value = r;
      if (interestRateSlider) interestRateSlider.value = r;
      loanTenureInput.value = t;
      if (loanTenureSlider) loanTenureSlider.value = t;

      updateLoanAmountWords(p);
      user.enterLoanDetails(p, r, t, u);
      user.calculateEMI();
    });
  });

  // Quick Test Case buttons in Calculator Form
  document.querySelectorAll('.btn-test-case').forEach(btn => {
    btn.addEventListener('click', () => {
      const testId = Number(btn.dataset.test);
      const tc = testCases.find(t => t.id === testId);
      if (tc) {
        user.setTenureUnit(tc.unit);
        loanAmountInput.value = tc.principal;
        if (loanAmountSlider && tc.principal !== '') loanAmountSlider.value = tc.principal;
        interestRateInput.value = tc.rate;
        if (interestRateSlider && tc.rate >= 0) interestRateSlider.value = tc.rate;
        loanTenureInput.value = tc.tenure;
        if (loanTenureSlider && tc.tenure > 0) loanTenureSlider.value = tc.tenure;

        updateLoanAmountWords(tc.principal);
        user.enterLoanDetails(tc.principal, tc.rate, tc.tenure, tc.unit);
        user.calculateEMI();
      }
    });
  });

  // Schedule search & filter
  if (scheduleSearch) {
    scheduleSearch.addEventListener('input', (e) => {
      result.searchQuery = e.target.value;
      result.currentPage = 1;
      result.displaySchedule();
    });
  }

  if (scheduleRowsSelect) {
    scheduleRowsSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      result.pageSize = val === 'all' ? 999999 : Number(val);
      result.currentPage = 1;
      result.displaySchedule();
    });
  }

  // CSV Export & Print
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      result.exportToCSV();
    });
  }

  if (printScheduleBtn) {
    printScheduleBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Architecture UML Tabs
  const archTabs = document.querySelectorAll('.arch-tab-btn');
  const archPanels = document.querySelectorAll('.arch-tab-content');
  archTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      archTabs.forEach(t => t.classList.remove('active'));
      archPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    });
  });

  // Test Suite Runner in UI
  const runAllTestsBtn = document.getElementById('runAllTestsBtn');
  const testResultsContainer = document.getElementById('testSuiteContainer');

  function renderTestCards() {
    if (!testResultsContainer) return;
    const testOutcomes = runAutomatedTests(validator, calculator);
    testResultsContainer.innerHTML = '';

    testOutcomes.forEach(tc => {
      const card = document.createElement('div');
      card.className = 'test-card';
      card.innerHTML = `
        <div>
          <div class="test-card-header">
            <span class="test-case-title">Test ${tc.id}: ${tc.name}</span>
            <span class="badge-status ${tc.passed ? 'badge-pass' : 'badge-fail'}">
              ${tc.passed ? '✓ PASSED' : '✕ FAILED'}
            </span>
          </div>
          <table class="test-specs-table">
            <tr>
              <td>Loan Amount:</td>
              <td>${tc.principal === '' ? '<span style="color:#ef4444">(Empty)</span>' : formatINR(tc.principal)}</td>
            </tr>
            <tr>
              <td>Interest Rate:</td>
              <td>${tc.rate}%</td>
            </tr>
            <tr>
              <td>Tenure:</td>
              <td>${tc.tenure} ${tc.unit}</td>
            </tr>
            <tr>
              <td>Expected:</td>
              <td>${tc.expectedEMI ? formatINR(tc.expectedEMI) : 'Validation Error'}</td>
            </tr>
            <tr>
              <td>Outcome:</td>
              <td style="color: ${tc.passed ? '#059669' : '#dc2626'}">${tc.notes}</td>
            </tr>
          </table>
        </div>
        <button class="btn-run-case" data-test="${tc.id}">Load This Case into Calculator</button>
      `;

      card.querySelector('.btn-run-case').addEventListener('click', () => {
        user.setTenureUnit(tc.unit);
        loanAmountInput.value = tc.principal;
        if (loanAmountSlider && tc.principal !== '') loanAmountSlider.value = tc.principal;
        interestRateInput.value = tc.rate;
        if (interestRateSlider && tc.rate >= 0) interestRateSlider.value = tc.rate;
        loanTenureInput.value = tc.tenure;
        if (loanTenureSlider && tc.tenure > 0) loanTenureSlider.value = tc.tenure;

        updateLoanAmountWords(tc.principal);
        user.enterLoanDetails(tc.principal, tc.rate, tc.tenure, tc.unit);
        user.calculateEMI();

        // Smooth scroll to calculator
        document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
      });

      testResultsContainer.appendChild(card);
    });
  }

  if (runAllTestsBtn) {
    runAllTestsBtn.addEventListener('click', () => {
      renderTestCards();
    });
  }

  // Initial load: calculate sample loan (₹5,00,000, 10%, 5 years)
  updateLoanAmountWords(500000);
  user.enterLoanDetails(500000, 10, 5, 'years');
  user.calculateEMI();
  renderTestCards();
  });
}
