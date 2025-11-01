// Константы
const ACQUIRING_RATE = 0.025; // 2.5%
const TAX_RATES = {
    low: 0.02,   // 2%
    medium: 0.05, // 5%
    high: 0.07   // 7%
};

// Функция загрузки товаров из внешнего файла, localStorage или использование дефолтных
async function loadProductsDatabase() {
    // Сначала пробуем загрузить из внешнего файла products.json
    try {
        const response = await fetch('products.json');
        if (response.ok) {
            const externalProducts = await response.json();
            if (Array.isArray(externalProducts) && externalProducts.length > 0) {
                console.log(`Загружено ${externalProducts.length} товаров из products.json`);
                // Сохраняем в localStorage для быстрого доступа
                localStorage.setItem('wb_products_external', JSON.stringify(externalProducts));
                return externalProducts;
            }
        }
    } catch (e) {
        console.log('Внешний файл products.json не найден');
    }
    
    // Пробуем загрузить commission.xlsx
    try {
        const response = await fetch('commission.xlsx');
        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Читаем данные БЕЗ заголовков, чтобы получить доступ к колонкам по индексу
            // Также пробуем с заголовками для обратной совместимости
            let jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                header: null,  // Без заголовков - получаем массивы
                defval: ''     // Пустые ячейки как пустые строки
            });
            
            // Если не получилось без заголовков, пробуем с заголовками
            if (!jsonData || jsonData.length === 0) {
                jsonData = XLSX.utils.sheet_to_json(firstSheet);
            }
            
            if (jsonData && jsonData.length > 0) {
                // Если данные в формате массива [A, B, C, ...]
                if (Array.isArray(jsonData[0])) {
                    // Преобразуем массивы в объекты с ключами B, C
                    jsonData = jsonData.map(row => {
                        if (Array.isArray(row)) {
                            return {
                                'A': row[0] || '',
                                'B': row[1] || '',
                                'C': row[2] || '',
                                'D': row[3] || '',
                                'E': row[4] || ''
                            };
                        }
                        return row;
                    });
                }
                
                const products = parseExcelData(jsonData);
                if (products.length > 0) {
                    console.log(`Загружено ${products.length} товаров из commission.xlsx (колонки B и C)`);
                    localStorage.setItem('wb_products_external', JSON.stringify(products));
                    return products;
                }
            }
        }
    } catch (e) {
        console.log('Внешний файл commission.xlsx не найден, используем локальную базу', e);
    }
    
    // Пробуем загрузить из localStorage (внешний файл был загружен ранее)
    const externalProducts = localStorage.getItem('wb_products_external');
    if (externalProducts) {
        try {
            const parsed = JSON.parse(externalProducts);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error('Ошибка загрузки внешних товаров из localStorage:', e);
        }
    }
    
    // Загружаем сохраненные пользователем товары
    const savedProducts = localStorage.getItem('wb_products_database');
    if (savedProducts) {
        try {
            const parsed = JSON.parse(savedProducts);
            // Объединяем сохраненные товары с дефолтными
            return [...DEFAULT_PRODUCTS_DATABASE, ...parsed];
        } catch (e) {
            console.error('Ошибка загрузки товаров из localStorage:', e);
            return DEFAULT_PRODUCTS_DATABASE;
        }
    }
    
    return DEFAULT_PRODUCTS_DATABASE;
}

// Функция сохранения товара в localStorage
function saveProductToDatabase(product) {
    const savedProducts = localStorage.getItem('wb_products_database');
    let products = [];
    
    if (savedProducts) {
        try {
            products = JSON.parse(savedProducts);
        } catch (e) {
            console.error('Ошибка чтения товаров из localStorage:', e);
        }
    }
    
    // Проверяем, нет ли уже такого товара
    const exists = products.some(p => p.name.toLowerCase() === product.name.toLowerCase());
    if (!exists) {
        products.push(product);
        localStorage.setItem('wb_products_database', JSON.stringify(products));
        return true;
    }
    return false;
}

// База данных товаров с комиссиями ВБ (по умолчанию)
// Формат: название товара, комиссия (%), тип склада
const DEFAULT_PRODUCTS_DATABASE = [
    // Одежда и обувь
    { name: "Футболка мужская", commission: 15.5, warehouse: "ФБО" },
    { name: "Джинсы женские", commission: 16.0, warehouse: "ФБО" },
    { name: "Кроссовки спортивные", commission: 18.0, warehouse: "ФБО" },
    { name: "Куртка зимняя", commission: 17.5, warehouse: "ФБО" },
    { name: "Платье летнее", commission: 16.5, warehouse: "ФБО" },
    { name: "Шорты мужские", commission: 15.0, warehouse: "ФБО" },
    
    // Электроника
    { name: "Смартфон", commission: 5.0, warehouse: "ФБО" },
    { name: "Наушники беспроводные", commission: 10.0, warehouse: "ФБО" },
    { name: "Зарядное устройство", commission: 15.0, warehouse: "ФБО" },
    { name: "Планшет", commission: 5.5, warehouse: "ФБО" },
    { name: "Смарт-часы", commission: 8.0, warehouse: "ФБО" },
    
    // Красота и здоровье
    { name: "Крем для лица", commission: 18.0, warehouse: "ФБО" },
    { name: "Шампунь", commission: 20.0, warehouse: "ФБО" },
    { name: "Духи", commission: 17.0, warehouse: "ФБО" },
    { name: "Масло для тела", commission: 19.0, warehouse: "ФБО" },
    
    // Дом и сад
    { name: "Постельное белье", commission: 18.5, warehouse: "ФБО" },
    { name: "Полотенце банное", commission: 19.0, warehouse: "ФБО" },
    { name: "Штора для окна", commission: 17.0, warehouse: "ФБО" },
    { name: "Подушка декоративная", commission: 18.0, warehouse: "ФБО" },
    
    // Спорт и отдых
    { name: "Мяч футбольный", commission: 15.0, warehouse: "ФБО" },
    { name: "Гантели", commission: 16.5, warehouse: "ФБО" },
    { name: "Рюкзак спортивный", commission: 17.5, warehouse: "ФБО" },
    
    // Детские товары
    { name: "Игрушка мягкая", commission: 20.0, warehouse: "ФБО" },
    { name: "Конструктор детский", commission: 18.5, warehouse: "ФБО" },
    { name: "Коляска детская", commission: 12.0, warehouse: "ФБО" },
    { name: "Детская одежда", commission: 19.0, warehouse: "ФБО" },
    
    // Автотовары
    { name: "Автомобильные коврики", commission: 17.0, warehouse: "ФБО" },
    { name: "Чехлы на сиденья", commission: 18.0, warehouse: "ФБО" },
    
    // Книги
    { name: "Книга художественная", commission: 15.0, warehouse: "ФБО" },
    { name: "Детская книга", commission: 16.0, warehouse: "ФБО" },
    
    // Продукты питания
    { name: "Чай черный", commission: 18.0, warehouse: "ФБО" },
    { name: "Кофе молотый", commission: 17.5, warehouse: "ФБО" },
    { name: "Сладости", commission: 19.0, warehouse: "ФБО" },
    
    // Бытовая техника
    { name: "Утюг электрический", commission: 12.0, warehouse: "ФБО" },
    { name: "Пылесос", commission: 11.0, warehouse: "ФБО" },
    { name: "Микроволновка", commission: 8.5, warehouse: "ФБО" },
    { name: "Кофемашина", commission: 7.0, warehouse: "ФБО" },
    { name: "Блендер", commission: 13.5, warehouse: "ФБО" },
    { name: "Чайник электрический", commission: 14.0, warehouse: "ФБО" },
    
    // Аксессуары
    { name: "Сумка женская", commission: 17.0, warehouse: "ФБО" },
    { name: "Ремень кожаный", commission: 18.5, warehouse: "ФБО" },
    { name: "Очки солнцезащитные", commission: 16.0, warehouse: "ФБО" },
    { name: "Часы наручные", commission: 12.5, warehouse: "ФБО" },
    
    // Товары для дома
    { name: "Светильник настольный", commission: 15.0, warehouse: "ФБО" },
    { name: "Ваза декоративная", commission: 19.5, warehouse: "ФБО" },
    { name: "Ковер напольный", commission: 16.5, warehouse: "ФБО" },
    { name: "Зеркало настенное", commission: 17.0, warehouse: "ФБО" },
    
    // Косметика и парфюмерия
    { name: "Помада губная", commission: 20.0, warehouse: "ФБО" },
    { name: "Тушь для ресниц", commission: 19.5, warehouse: "ФБО" },
    { name: "Тональный крем", commission: 18.5, warehouse: "ФБО" },
    { name: "Лак для ногтей", commission: 19.0, warehouse: "ФБО" },
    
    // Спортивные товары
    { name: "Фитнес-браслет", commission: 9.0, warehouse: "ФБО" },
    { name: "Йога-коврик", commission: 18.0, warehouse: "ФБО" },
    { name: "Гантели разборные", commission: 15.5, warehouse: "ФБО" },
    { name: "Велосипед спортивный", commission: 10.0, warehouse: "ФБО" },
    
    // Компьютеры и аксессуары
    { name: "Клавиатура игровая", commission: 12.0, warehouse: "ФБО" },
    { name: "Мышь компьютерная", commission: 13.0, warehouse: "ФБО" },
    { name: "Коврик для мыши", commission: 20.0, warehouse: "ФБО" },
    { name: "Веб-камера", commission: 11.5, warehouse: "ФБО" },
    
    // Товары для животных
    { name: "Корм для собак", commission: 19.0, warehouse: "ФБО" },
    { name: "Корм для кошек", commission: 19.0, warehouse: "ФБО" },
    { name: "Ошейник для собаки", commission: 18.5, warehouse: "ФБО" },
    { name: "Игрушка для кота", commission: 20.0, warehouse: "ФБО" },
    
    // Сад и огород
    { name: "Семена овощные", commission: 18.0, warehouse: "ФБО" },
    { name: "Удобрение для растений", commission: 17.5, warehouse: "ФБО" },
    { name: "Горшок цветочный", commission: 19.5, warehouse: "ФБО" },
    
    // Инструменты
    { name: "Дрель электрическая", commission: 10.5, warehouse: "ФБО" },
    { name: "Молоток", commission: 16.0, warehouse: "ФБО" },
    { name: "Отвертка набор", commission: 17.0, warehouse: "ФБО" },
    
    // Канцтовары
    { name: "Ручка шариковая", commission: 20.0, warehouse: "ФБО" },
    { name: "Блокнот", commission: 18.5, warehouse: "ФБО" },
    { name: "Папка-файл", commission: 19.0, warehouse: "ФБО" },
    
    // Товары для ванной
    { name: "Полотенце махровое", commission: 19.0, warehouse: "ФБО" },
    { name: "Коврик для ванной", commission: 18.5, warehouse: "ФБО" },
    { name: "Зеркало для ванной", commission: 17.0, warehouse: "ФБО" },
    
    // Добавьте больше товаров по мере необходимости
    // Формат: { name: "Название", commission: процент, warehouse: "ФБО" или "ФБС" }
];

// Загружаем базу данных товаров (асинхронно)
let PRODUCTS_DATABASE = [];
loadProductsDatabase().then(products => {
    PRODUCTS_DATABASE = products;
    console.log(`База товаров загружена: ${PRODUCTS_DATABASE.length} товаров`);
}).catch(err => {
    console.error('Ошибка загрузки базы товаров:', err);
    PRODUCTS_DATABASE = DEFAULT_PRODUCTS_DATABASE;
});

// Telegram Web App инициализация
let tg = null;
let isTelegramWebApp = false;

// Проверяем, запущено ли приложение в Telegram
if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    isTelegramWebApp = true;
    console.log('Telegram Web App detected');
}

// Функция для форматирования чисел
function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

// Функция для форматирования процентов
function formatPercent(num, decimals = 2) {
    return formatNumber(num * 100, decimals) + '%';
}

// Функция для получения значения из поля ввода
function getInputValue(id) {
    const element = document.getElementById(id);
    const value = parseFloat(element.value) || 0;
    return value;
}

// Функция для валидации данных
function validateInputs() {
    const requiredFields = [
        'units-sold',
        'purchase-price',
        'selling-price'
    ];
    
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        const value = getInputValue(fieldId);
        
        if (value <= 0) {
            element.classList.add('error');
            isValid = false;
        } else {
            element.classList.remove('error');
        }
    });
    
    return isValid;
}


// Основная функция расчета
function calculateEconomics() {
    // Валидация данных
    if (!validateInputs()) {
        alert('Пожалуйста, заполните все обязательные поля корректными значениями.');
        return;
    }
    
    // Получение данных из формы
    const data = {
        unitsSold: getInputValue('units-sold'),
        logistics: getInputValue('logistics'),
        fulfillment: getInputValue('fulfillment'),
        paidAcceptance: getInputValue('paid-acceptance'),
        wbCommission: getInputValue('wb-commission') / 100, // Конвертируем в десятичную дробь
        storageCost: getInputValue('storage-cost'),
        advertising: getInputValue('advertising'),
        purchasePrice: getInputValue('purchase-price'),
        sellingPrice: getInputValue('selling-price'),
        redemptionRate: getInputValue('redemption-rate') / 100 // Конвертируем в десятичную дробь
    };
    
    // Расчеты для одной единицы товара
    const unitCalculations = calculateUnitEconomics(data);
    
    // Расчеты для общего количества
    const totalCalculations = calculateTotalEconomics(data, unitCalculations);
    
    // Отображение результатов
    displayResults(unitCalculations, totalCalculations, data);
    
    // Добавляем класс для анимации
    document.querySelector('.results-section').classList.add('calculated');
    
    // Показываем главную кнопку Telegram после расчета
    if (isTelegramWebApp && tg) {
        tg.MainButton.show();
    }
}

// Расчет юнит-экономики для одной единицы
function calculateUnitEconomics(data) {
    const {
        logistics,
        fulfillment,
        paidAcceptance,
        wbCommission,
        storageCost,
        advertising,
        purchasePrice,
        sellingPrice,
        redemptionRate
    } = data;
    
    // Выручка с учетом процента выкупа
    const revenue = sellingPrice * redemptionRate;
    
    // Комиссия ВБ
    const wbCommissionAmount = revenue * wbCommission;
    
    // Эквайринг
    const acquiringAmount = revenue * ACQUIRING_RATE;
    
    // Общие расходы на единицу товара
    const totalCosts = purchasePrice + logistics + fulfillment + paidAcceptance + storageCost + advertising;
    
    // Налоги
    const taxes = {
        low: revenue * TAX_RATES.low,
        medium: revenue * TAX_RATES.medium,
        high: revenue * TAX_RATES.high
    };
    
    // Прибыль до налогов
    const profitBeforeTax = revenue - wbCommissionAmount - acquiringAmount - totalCosts;
    
    // Прибыль после налогов
    const profits = {
        low: profitBeforeTax - taxes.low,
        medium: profitBeforeTax - taxes.medium,
        high: profitBeforeTax - taxes.high
    };
    
    // Маржинальность (прибыль / выручка * 100)
    const margin = revenue > 0 ? (profitBeforeTax / revenue) * 100 : 0;
    
    // Рентабельность (прибыль / себестоимость * 100)
    const profitability = totalCosts > 0 ? (profitBeforeTax / totalCosts) * 100 : 0;
    
    return {
        revenue,
        wbCommissionAmount,
        acquiringAmount,
        totalCosts,
        taxes,
        profitBeforeTax,
        profits,
        margin,
        profitability
    };
}

// Расчет общей экономики
function calculateTotalEconomics(data, unitCalculations) {
    const { unitsSold } = data;
    
    return {
        totalRevenue: unitCalculations.revenue * unitsSold,
        totalWbCommission: unitCalculations.wbCommissionAmount * unitsSold,
        totalAcquiring: unitCalculations.acquiringAmount * unitsSold,
        totalCosts: unitCalculations.totalCosts * unitsSold,
        totalTaxes: {
            low: unitCalculations.taxes.low * unitsSold,
            medium: unitCalculations.taxes.medium * unitsSold,
            high: unitCalculations.taxes.high * unitsSold
        },
        totalProfitBeforeTax: unitCalculations.profitBeforeTax * unitsSold,
        totalProfits: {
            low: unitCalculations.profits.low * unitsSold,
            medium: unitCalculations.profits.medium * unitsSold,
            high: unitCalculations.profits.high * unitsSold
        }
    };
}

// Функции для работы с Telegram
function initTelegramWebApp() {
    if (isTelegramWebApp && tg) {
        // Настраиваем приложение
        tg.ready();
        tg.expand();
        
        // Принудительно применяем тему Telegram (обновляем)
        document.body.classList.remove('telegram-webapp');
        setTimeout(() => {
            document.body.classList.add('telegram-webapp');
            // Применяем стили для контейнера
            const container = document.querySelector('.container');
            if (container) {
                container.classList.add('telegram-webapp');
            }
        }, 50);
        
        // Оптимизируем для Telegram: убираем лишние отступы
        document.documentElement.style.setProperty('--tg-viewport-height', tg.viewportHeight + 'px');
        
        // Настройка темы Telegram
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('telegram-dark');
        }
        
        // Обработка изменения размера viewport
        tg.onEvent('viewportChanged', () => {
            document.documentElement.style.setProperty('--tg-viewport-height', tg.viewportHeight + 'px');
        });
        
        // Настраиваем главную кнопку для быстрого обмена результатами
        tg.MainButton.setText('📊 Поделиться результатами');
        tg.MainButton.hide(); // Скрываем до выполнения расчета
        tg.MainButton.onClick(shareResults);
        
        // Настраиваем кнопку "Назад"
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.close();
        });
        
        console.log('Telegram Web App initialized - Version 2.0');
        console.log('User:', tg.initDataUnsafe.user);
        
        // Принудительная проверка наличия поля поиска
        setTimeout(() => {
            const searchField = document.getElementById('product-search');
            if (searchField) {
                console.log('✅ Поле поиска найдено и доступно');
                searchField.style.display = 'block';
                searchField.style.visibility = 'visible';
                searchField.style.opacity = '1';
            } else {
                console.error('❌ Поле поиска НЕ найдено! Проверьте index.html');
            }
        }, 100);
        
        // Показываем приветственное уведомление только при первом запуске
        const firstVisit = !localStorage.getItem('wb_app_visited_v2');
        if (firstVisit) {
            localStorage.setItem('wb_app_visited_v2', 'true');
            setTimeout(() => {
                tg.showPopup({
                    title: '🎉 Обновление!',
                    message: '✨ Добавлен поиск товаров!\n\n🔍 Начните вводить название товара в поле поиска\n📊 Комиссия заполнится автоматически\n\n💡 Поле поиска находится в начале формы',
                    buttons: [{type: 'ok', text: 'Понятно'}]
                });
            }, 500);
        }
    }
}


function shareResults() {
    if (!isTelegramWebApp || !tg) return;
    
    const results = getCurrentResults();
    const message = formatResultsForSharing(results);
    
    // Отправляем данные в Telegram
    tg.sendData(JSON.stringify({
        type: 'unit_economics_results',
        data: results,
        message: message
    }));
    
    // Показываем уведомление
    tg.showAlert('Результаты отправлены!');
}

function getCurrentResults() {
    return {
        timestamp: new Date().toLocaleString('ru-RU'),
        inputs: {
            unitsSold: getInputValue('units-sold'),
            logistics: getInputValue('logistics'),
            fulfillment: getInputValue('fulfillment'),
            paidAcceptance: getInputValue('paid-acceptance'),
            wbCommission: getInputValue('wb-commission'),
            storageCost: getInputValue('storage-cost'),
            advertising: getInputValue('advertising'),
            purchasePrice: getInputValue('purchase-price'),
            sellingPrice: getInputValue('selling-price'),
            redemptionRate: getInputValue('redemption-rate')
        },
        results: {
            margin: document.getElementById('margin').textContent,
            profitability: document.getElementById('profitability').textContent,
            profit5: document.getElementById('profit-5').textContent,
            profit7: document.getElementById('profit-7').textContent,
            profit2: document.getElementById('profit-2').textContent
        }
    };
}

function formatResultsForSharing(results) {
    const { inputs, results: calcResults } = results;
    
    return `📊 *Результаты расчета юнит-экономики*

💰 *Основные параметры:*
• Продано единиц: ${inputs.unitsSold}
• Цена продажи: ${inputs.sellingPrice} руб.
• Закупочная цена: ${inputs.purchasePrice} руб.
• Комиссия ВБ: ${inputs.wbCommission}%

📈 *Результаты:*
• Маржинальность: ${calcResults.margin}
• Рентабельность: ${calcResults.profitability}
• Прибыль (5%): ${calcResults.profit5}
• Прибыль (7%): ${calcResults.profit7}
• Прибыль (2%): ${calcResults.profit2}

🤖 *Калькулятор:* @MaksimovWB`;
}

function formatExportForTelegram(results) {
    const { inputs, results: calcResults } = results;
    
    return `📊 *ЭКСПОРТ РАСЧЕТА ЮНИТ-ЭКОНОМИКИ*
🕐 *Дата:* ${results.timestamp}

💼 *ВХОДНЫЕ ДАННЫЕ:*
• Продано единиц: ${inputs.unitsSold}
• Цена продажи: ${formatNumber(inputs.sellingPrice)} руб.
• Закупочная цена: ${formatNumber(inputs.purchasePrice)} руб.
• Логистика ВБ: ${formatNumber(inputs.logistics)} руб.
• Фулфилмент: ${formatNumber(inputs.fulfillment)} руб.
• Платная приемка: ${formatNumber(inputs.paidAcceptance)} руб.
• Комиссия ВБ: ${inputs.wbCommission}%
• Стоимость хранения: ${formatNumber(inputs.storageCost)} руб.
• Реклама: ${formatNumber(inputs.advertising)} руб.
• Процент выкупа: ${inputs.redemptionRate}%

💰 *НАЛОГООБЛОЖЕНИЕ:*
• Налог 2%: ${calcResults.tax2}
• Налог 5%: ${calcResults.tax5}
• Налог 7%: ${calcResults.tax7}

📈 *ПРИБЫЛЬ ПОСЛЕ НАЛОГОВ:*
• При ставке 2%: ${calcResults.profit2}
• При ставке 5%: ${calcResults.profit5}
• При ставке 7%: ${calcResults.profit7}

🎯 *КЛЮЧЕВЫЕ МЕТРИКИ:*
• Маржинальность: ${calcResults.margin}
• Рентабельность: ${calcResults.profitability}

📋 *ДЕТАЛЬНАЯ СВОДКА:*
Общая себестоимость = Закупочная цена + Логистика + Фулфилмент + Платная приемка + Хранение + Реклама

🤖 *Калькулятор создан:* [@MaksimovWB](https://t.me/MaksimovWB)
📱 *Для селлеров Wildberries*`;
}

// Отображение результатов
function displayResults(unitCalculations, totalCalculations, data) {
    // Налоги
    document.getElementById('tax-5').textContent = formatNumber(unitCalculations.taxes.medium) + ' руб.';
    document.getElementById('tax-7').textContent = formatNumber(unitCalculations.taxes.high) + ' руб.';
    document.getElementById('tax-2').textContent = formatNumber(unitCalculations.taxes.low) + ' руб.';
    
    // Прибыль
    document.getElementById('profit-5').textContent = formatNumber(unitCalculations.profits.medium) + ' руб.';
    document.getElementById('profit-7').textContent = formatNumber(unitCalculations.profits.high) + ' руб.';
    document.getElementById('profit-2').textContent = formatNumber(unitCalculations.profits.low) + ' руб.';
    
    // Ключевые метрики
    document.getElementById('margin').textContent = formatPercent(unitCalculations.margin / 100);
    document.getElementById('profitability').textContent = formatPercent(unitCalculations.profitability / 100);
    
    // Сводка по единице товара
    const summaryElement = document.getElementById('unit-summary');
    summaryElement.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong>Выручка с единицы:</strong><br>
                ${formatNumber(unitCalculations.revenue)} руб.
            </div>
            <div>
                <strong>Себестоимость единицы:</strong><br>
                ${formatNumber(unitCalculations.totalCosts)} руб.
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong>Комиссия ВБ:</strong><br>
                ${formatNumber(unitCalculations.wbCommissionAmount)} руб.
            </div>
            <div>
                <strong>Эквайринг:</strong><br>
                ${formatNumber(unitCalculations.acquiringAmount)} руб.
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong>Логистика ВБ:</strong><br>
                ${formatNumber(data.logistics)} руб.
            </div>
            <div>
                <strong>Фулфилмент:</strong><br>
                ${formatNumber(data.fulfillment)} руб.
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong>Платная приемка:</strong><br>
                ${formatNumber(data.paidAcceptance)} руб.
            </div>
            <div>
                <strong>Хранение:</strong><br>
                ${formatNumber(data.storageCost)} руб.
            </div>
        </div>
        <div style="background: rgba(255,255,255,0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <strong>Общая сводка (${data.unitsSold} единиц):</strong><br>
            • Общая выручка: ${formatNumber(totalCalculations.totalRevenue)} руб.<br>
            • Общие расходы: ${formatNumber(totalCalculations.totalCosts)} руб.<br>
            • Прибыль до налогов: ${formatNumber(totalCalculations.totalProfitBeforeTax)} руб.<br>
            • Лучшая прибыль (2%): ${formatNumber(totalCalculations.totalProfits.low)} руб.
        </div>
    `;
}

// Функция для очистки формы
function clearForm() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.value = '';
        input.classList.remove('error');
    });
    
    // Очищаем результаты
    const resultElements = document.querySelectorAll('.value');
    resultElements.forEach(element => {
        if (element.id) {
            element.textContent = '0.00 руб.';
        }
    });
    
    document.getElementById('margin').textContent = '0.00%';
    document.getElementById('profitability').textContent = '0.00%';
    document.getElementById('unit-summary').innerHTML = '<p>Заполните данные для расчета</p>';
    
    document.querySelector('.results-section').classList.remove('calculated');
    
    // Скрываем главную кнопку Telegram при очистке
    if (isTelegramWebApp && tg) {
        tg.MainButton.hide();
    }
}

// Функция для экспорта результатов
function exportResults() {
    // Проверяем, есть ли результаты для экспорта
    const margin = document.getElementById('margin').textContent;
    if (margin === '0.00%') {
        alert('Сначала выполните расчет, а затем экспортируйте результаты.');
        return;
    }

    const results = {
        timestamp: new Date().toLocaleString('ru-RU'),
        inputs: {
            unitsSold: getInputValue('units-sold'),
            logistics: getInputValue('logistics'),
            fulfillment: getInputValue('fulfillment'),
            paidAcceptance: getInputValue('paid-acceptance'),
            wbCommission: getInputValue('wb-commission'),
            storageCost: getInputValue('storage-cost'),
            advertising: getInputValue('advertising'),
            purchasePrice: getInputValue('purchase-price'),
            sellingPrice: getInputValue('selling-price'),
            redemptionRate: getInputValue('redemption-rate')
        },
        results: {
            margin: document.getElementById('margin').textContent,
            profitability: document.getElementById('profitability').textContent,
            profit5: document.getElementById('profit-5').textContent,
            profit7: document.getElementById('profit-7').textContent,
            profit2: document.getElementById('profit-2').textContent,
            tax5: document.getElementById('tax-5').textContent,
            tax7: document.getElementById('tax-7').textContent,
            tax2: document.getElementById('tax-2').textContent
        }
    };
    
    // Если запущено в Telegram Web App - отправляем данные боту
    if (isTelegramWebApp && tg) {
        const exportMessage = formatExportForTelegram(results);
        
        // Отправляем данные боту
        tg.sendData(JSON.stringify({
            type: 'export_results',
            data: results,
            message: exportMessage
        }));
        
        // Показываем уведомление
        tg.showAlert('📊 Результаты расчета отправлены!');
        
        // Логируем для отладки
        console.log('Export data sent to Telegram bot:', results);
    } else {
        // Обычный экспорт в файл для браузера
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `unit-economics-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Показываем уведомление для браузера
        alert('📊 Результаты экспортированы в файл!');
    }
}

// Функция поиска товаров
function searchProducts(query) {
    if (!query || query.trim().length < 2) {
        return [];
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    // Если база еще не загружена, используем дефолтную
    const db = PRODUCTS_DATABASE.length > 0 ? PRODUCTS_DATABASE : DEFAULT_PRODUCTS_DATABASE;
    
    return db.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
    ).slice(0, 10); // Ограничиваем до 10 результатов
}

// Функция отображения подсказок
function displaySuggestions(suggestions) {
    const suggestionsList = document.getElementById('product-suggestions');
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="suggestion-item"><div class="suggestion-item-name">Товар не найден</div></div>';
        suggestionsList.classList.add('show');
        return;
    }
    
    suggestionsList.innerHTML = suggestions.map((product, index) => `
        <div class="suggestion-item" data-index="${index}" data-product='${JSON.stringify(product)}'>
            <div style="flex: 1;">
                <div class="suggestion-item-name">${product.name}</div>
                ${product.category ? `<div class="suggestion-item-warehouse" style="margin-top: 4px; color: #6366f1; font-size: 0.75rem;">📁 ${product.category}</div>` : ''}
            </div>
            <div class="suggestion-item-info">
                <div class="suggestion-item-commission">${product.commission}%</div>
                <div class="suggestion-item-warehouse">${product.warehouse}</div>
            </div>
        </div>
    `).join('');
    
    suggestionsList.classList.add('show');
    
    // Добавляем обработчики клика на элементы
    suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const product = JSON.parse(this.dataset.product);
            selectProduct(product);
        });
        
        item.addEventListener('mouseenter', function() {
            this.classList.add('selected');
        });
        
        item.addEventListener('mouseleave', function() {
            this.classList.remove('selected');
        });
    });
}

// Функция выбора товара
function selectProduct(product) {
    const searchInput = document.getElementById('product-search');
    const commissionInput = document.getElementById('wb-commission');
    const suggestionsList = document.getElementById('product-suggestions');
    
    // Заполняем поля
    searchInput.value = product.name;
    commissionInput.value = product.commission;
    
    // Скрываем список подсказок
    suggestionsList.classList.remove('show');
    
    // Добавляем визуальное подтверждение
    searchInput.style.borderColor = '#10b981';
    commissionInput.style.borderColor = '#10b981';
    
    setTimeout(() => {
        searchInput.style.borderColor = '';
        commissionInput.style.borderColor = '';
    }, 2000);
    
    // Фокус на следующее поле
    commissionInput.focus();
}

// Функция скрытия подсказок
function hideSuggestions() {
    const suggestionsList = document.getElementById('product-suggestions');
    suggestionsList.classList.remove('show');
}

// Функции для работы с модальным окном добавления товара
function showAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    modal.classList.add('show');
    document.getElementById('new-product-name').focus();
}

function hideAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    modal.classList.remove('show');
    // Очищаем поля
    document.getElementById('new-product-name').value = '';
    document.getElementById('new-product-commission').value = '';
    document.getElementById('new-product-warehouse').value = 'ФБО';
}

function addNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const commission = parseFloat(document.getElementById('new-product-commission').value);
    const warehouse = document.getElementById('new-product-warehouse').value;
    
    // Валидация
    if (!name || name.length < 2) {
        alert('Пожалуйста, введите название товара (минимум 2 символа)');
        return;
    }
    
    if (!commission || commission <= 0 || commission > 100) {
        alert('Пожалуйста, введите корректную комиссию (от 0 до 100%)');
        return;
    }
    
    const newProduct = {
        name: name,
        commission: commission,
        warehouse: warehouse
    };
    
    if (saveProductToDatabase(newProduct)) {
        // Обновляем базу данных
        PRODUCTS_DATABASE = loadProductsDatabase();
        
        // Показываем уведомление
        if (isTelegramWebApp && tg) {
            tg.showAlert('✅ Товар успешно добавлен!');
        } else {
            alert('✅ Товар успешно добавлен!');
        }
        
        // Автоматически выбираем добавленный товар
        selectProduct(newProduct);
        
        // Закрываем модальное окно
        hideAddProductModal();
    } else {
        alert('⚠️ Такой товар уже существует в базе данных');
    }
}

// Функции для работы с импортом товаров
function showImportModal() {
    const modal = document.getElementById('import-products-modal');
    modal.classList.add('show');
    document.getElementById('import-data').focus();
}

function hideImportModal() {
    const modal = document.getElementById('import-products-modal');
    modal.classList.remove('show');
    document.getElementById('import-data').value = '';
    document.getElementById('import-format').value = 'json';
    document.getElementById('import-file').value = '';
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Обработка Excel файлов
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Читаем данные БЕЗ заголовков для корректной работы с колонками B и C
                let jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    header: null,
                    defval: ''
                });
                
                // Преобразуем в объекты для отображения
                if (jsonData && jsonData.length > 0 && Array.isArray(jsonData[0])) {
                    jsonData = jsonData.map((row, index) => {
                        if (Array.isArray(row)) {
                            return {
                                'A': row[0] || '',
                                'B': row[1] || '',
                                'C': row[2] || '',
                                'D': row[3] || '',
                                'E': row[4] || ''
                            };
                        }
                        return row;
                    });
                }
                
                // Конвертируем в JSON строку для отображения
                document.getElementById('import-data').value = JSON.stringify(jsonData, null, 2);
                document.getElementById('import-format').value = 'json';
            } catch (error) {
                alert(`❌ Ошибка чтения Excel файла: ${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // Обработка текстовых файлов
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('import-data').value = e.target.result;
            // Автоопределение формата
            if (file.name.endsWith('.csv')) {
                document.getElementById('import-format').value = 'csv';
            } else {
                document.getElementById('import-format').value = 'json';
            }
        };
        reader.readAsText(file);
    }
}

// Функция парсинга данных из Excel
// Читает колонку B (название товара) и колонку C (комиссия)
function parseExcelData(jsonData) {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        return [];
    }
    
    return jsonData.map((row, index) => {
        let name = '';
        let commission = 15.0;
        let warehouse = 'ФБО';
        let category = '';
        
        // Если данные в формате объектов с ключами 'A', 'B', 'C'
        if (row['B'] !== undefined) {
            name = (row['B'] || '').toString().trim();
            commission = parseFloat(row['C'] || 15.0);
            warehouse = (row['D'] || 'ФБО').toString().trim() || 'ФБО';
            category = (row['E'] || '').toString().trim();
        }
        // Если данные в формате массива [A, B, C, ...]
        else if (Array.isArray(row)) {
            name = (row[1] || '').toString().trim(); // Колонка B (индекс 1)
            commission = parseFloat(row[2] || 15.0); // Колонка C (индекс 2)
            warehouse = (row[3] || 'ФБО').toString().trim() || 'ФБО'; // Колонка D (если есть)
            category = (row[4] || '').toString().trim(); // Колонка E (если есть)
        }
        // Если данные с заголовками - берем значения из второй и третьей позиции
        else {
            const values = Object.values(row);
            const keys = Object.keys(row);
            
            // Берем второй элемент (колонка B)
            if (values.length >= 2) {
                name = (values[1] || '').toString().trim();
            }
            // Берем третий элемент (колонка C)
            if (values.length >= 3) {
                commission = parseFloat(values[2] || 15.0);
            }
            // Если не получилось, пробуем по ключам
            if ((!name || name.length < 2) && keys.length >= 2) {
                name = (row[keys[1]] || '').toString().trim();
            }
            if ((isNaN(commission) || commission === 15.0) && keys.length >= 3) {
                const commValue = parseFloat(row[keys[2]] || 15.0);
                if (!isNaN(commValue)) commission = commValue;
            }
        }
        
        // Обратная совместимость с названиями колонок (на случай если файл с заголовками)
        if (!name || name.length < 2) {
            name = row['Название'] || row['Название товара'] || row['Товар'] || row['Name'] || row['Product'] || '';
            if (!name || name.length < 2) {
                // Пропускаем эту строку если нет названия
                return null;
            }
        }
        
        // Если комиссия не была найдена, пытаемся найти по названиям
        if (isNaN(commission) || commission === 15.0) {
            const altCommission = parseFloat(row['Комиссия'] || row['Комиссия ВБ'] || row['%'] || row['Commission'] || 15.0);
            if (!isNaN(altCommission) && altCommission > 0) {
                commission = altCommission;
            }
        }
        
        return {
            name: name.toString().trim(),
            commission: isNaN(commission) || commission <= 0 ? 15.0 : commission,
            warehouse: warehouse.trim() || 'ФБО',
            category: category.toString().trim() || ''
        };
    }).filter(p => p !== null && p.name && p.name.length >= 2);
}

// Функция загрузки товаров из файла при первом запуске
function loadProductsFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Обработка Excel файлов
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = e.target.result;
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Читаем данные БЕЗ заголовков для доступа к колонкам B и C
                let jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    header: null,  // Без заголовков
                    defval: ''     // Пустые ячейки
                });
                
                // Преобразуем массивы в объекты с ключами B, C
                if (jsonData && jsonData.length > 0 && Array.isArray(jsonData[0])) {
                    jsonData = jsonData.map(row => {
                        if (Array.isArray(row)) {
                            return {
                                'A': row[0] || '',
                                'B': row[1] || '',
                                'C': row[2] || '',
                                'D': row[3] || '',
                                'E': row[4] || ''
                            };
                        }
                        return row;
                    });
                }
                
                const products = parseExcelData(jsonData);
                
                if (products.length === 0) {
                    alert('❌ Файл не содержит валидных данных о товарах. Проверьте названия колонок.');
                    return;
                }
                
                // Сохраняем во внешнее хранилище
                localStorage.setItem('wb_products_external', JSON.stringify(products));
                
                // Обновляем базу данных
                PRODUCTS_DATABASE = products;
                
                const message = `✅ Загружено ${products.length} товаров из Excel файла!`;
                
                if (isTelegramWebApp && tg) {
                    tg.showAlert(message);
                } else {
                    alert(message);
                }
                
                // Очищаем input
                event.target.value = '';
                
            } catch (error) {
                alert(`❌ Ошибка загрузки Excel файла: ${error.message}`);
                console.error('Load Excel error:', error);
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        // Обработка JSON и CSV файлов
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let products = [];
                const content = e.target.result.trim();
                
                if (fileExtension === 'json') {
                    products = JSON.parse(content);
                } else if (fileExtension === 'csv') {
                    const lines = content.split('\n').filter(line => line.trim());
                    products = lines.map((line, index) => {
                        // Пропускаем заголовок если есть
                        if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('название'))) {
                            return null;
                        }
                        const parts = line.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            return {
                                name: parts[0],
                                commission: parseFloat(parts[1]) || 15.0,
                                warehouse: parts[2] || 'ФБО',
                                category: parts[3] || ''
                            };
                        }
                        return null;
                    }).filter(p => p !== null);
                }
                
                if (!Array.isArray(products) || products.length === 0) {
                    alert('❌ Файл не содержит валидных данных о товарах');
                    return;
                }
                
                // Валидация и нормализация
                const validProducts = products.map(product => {
                    // Поддержка разных форматов данных
                    return {
                        name: product.name || product.Название || product.product_name || '',
                        commission: product.commission || product.Комиссия || product.commission_rate || product['%'] || 15.0,
                        warehouse: product.warehouse || product.Склад || product.warehouse_type || 'ФБО',
                        category: product.category || product.Категория || product.product_category || ''
                    };
                }).filter(p => p.name && p.name.length >= 2);
                
                // Сохраняем во внешнее хранилище (перезаписывает дефолтную базу)
                localStorage.setItem('wb_products_external', JSON.stringify(validProducts));
                
                // Обновляем базу данных
                PRODUCTS_DATABASE = validProducts;
                
                const message = `✅ Загружено ${validProducts.length} товаров из файла!`;
                
                if (isTelegramWebApp && tg) {
                    tg.showAlert(message);
                } else {
                    alert(message);
                }
                
                // Очищаем input
                event.target.value = '';
                
            } catch (error) {
                alert(`❌ Ошибка загрузки файла: ${error.message}`);
                console.error('Load products error:', error);
            }
        };
        reader.readAsText(file);
    }
}

function importProducts() {
    const importData = document.getElementById('import-data').value.trim();
    const format = document.getElementById('import-format').value;
    
    if (!importData) {
        alert('Пожалуйста, введите или загрузите данные для импорта');
        return;
    }
    
    let products = [];
    
    try {
        if (format === 'json') {
            // Парсим JSON
            products = JSON.parse(importData);
            if (!Array.isArray(products)) {
                throw new Error('JSON должен быть массивом товаров');
            }
        } else if (format === 'csv') {
            // Парсим CSV
            const lines = importData.split('\n').filter(line => line.trim());
            products = lines.map(line => {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 3) {
                    throw new Error('CSV формат: Название,Комиссия,Склад');
                }
                return {
                    name: parts[0],
                    commission: parseFloat(parts[1]),
                    warehouse: parts[2]
                };
            });
        }
        
        // Валидация товаров
        let validProducts = [];
        let skipped = 0;
        
        products.forEach(product => {
            if (!product.name || product.name.length < 2) {
                skipped++;
                return;
            }
            if (!product.commission || product.commission <= 0 || product.commission > 100) {
                skipped++;
                return;
            }
            if (!product.warehouse || !['ФБО', 'ФБС'].includes(product.warehouse)) {
                product.warehouse = 'ФБО'; // Дефолтное значение
            }
            
            // Сохраняем товар
            if (saveProductToDatabase(product)) {
                validProducts.push(product);
            } else {
                skipped++;
            }
        });
        
        // Обновляем базу данных
        PRODUCTS_DATABASE = loadProductsDatabase();
        
        // Показываем результат
        const message = `✅ Импортировано товаров: ${validProducts.length}\n${skipped > 0 ? `⚠️ Пропущено (дубликаты/невалидные): ${skipped}` : ''}`;
        
        if (isTelegramWebApp && tg) {
            tg.showAlert(message);
        } else {
            alert(message);
        }
        
        hideImportModal();
        
    } catch (error) {
        alert(`❌ Ошибка импорта: ${error.message}\n\nУбедитесь, что формат данных корректный.`);
        console.error('Import error:', error);
    }
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    initTelegramWebApp();
    
    // Инициализация поиска товаров
    const productSearch = document.getElementById('product-search');
    const suggestionsList = document.getElementById('product-suggestions');
    let searchTimeout;
    
    if (productSearch) {
        // Поиск при вводе текста
        productSearch.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                hideSuggestions();
                return;
            }
            
            searchTimeout = setTimeout(() => {
                const suggestions = searchProducts(query);
                displaySuggestions(suggestions);
            }, 300); // Задержка для оптимизации
        });
        
        // Скрытие подсказок при потере фокуса (с задержкой для обработки клика)
        productSearch.addEventListener('blur', function() {
            setTimeout(() => {
                hideSuggestions();
            }, 200);
        });
        
        // Показ подсказок при фокусе (если есть текст)
        productSearch.addEventListener('focus', function() {
            const query = this.value.trim();
            if (query.length >= 2) {
                const suggestions = searchProducts(query);
                displaySuggestions(suggestions);
            }
        });
        
        // Обработка клавиатуры для навигации по подсказкам
        let selectedIndex = -1;
        
        productSearch.addEventListener('keydown', function(e) {
            const suggestions = suggestionsList.querySelectorAll('.suggestion-item');
            
            if (suggestions.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % suggestions.length;
                suggestions.forEach((item, index) => {
                    if (index === selectedIndex) {
                        item.classList.add('selected');
                        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    } else {
                        item.classList.remove('selected');
                    }
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
                suggestions.forEach((item, index) => {
                    if (index === selectedIndex) {
                        item.classList.add('selected');
                        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    } else {
                        item.classList.remove('selected');
                    }
                });
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const selectedItem = suggestions[selectedIndex];
                if (selectedItem) {
                    const product = JSON.parse(selectedItem.dataset.product);
                    selectProduct(product);
                    selectedIndex = -1;
                }
            } else if (e.key === 'Escape') {
                hideSuggestions();
                selectedIndex = -1;
            }
        });
    }
    
    // Закрытие модальных окон при клике вне их
    const addProductModal = document.getElementById('add-product-modal');
    if (addProductModal) {
        addProductModal.addEventListener('click', function(e) {
            if (e.target === addProductModal) {
                hideAddProductModal();
            }
        });
    }
    
    const importModal = document.getElementById('import-products-modal');
    if (importModal) {
        importModal.addEventListener('click', function(e) {
            if (e.target === importModal) {
                hideImportModal();
            }
        });
    }
    
    // Автоматический расчет при изменении полей
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Убираем класс ошибки при вводе
            this.classList.remove('error');
        });
    });
    
    // Обработка Enter в полях ввода
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateEconomics();
            }
        });
    });
    
    // Добавляем кнопки управления
    const inputSection = document.querySelector('.input-section');
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Очистить';
    clearBtn.className = 'calculate-btn';
    clearBtn.style.cssText = 'background: #6c757d; flex: 1;';
    clearBtn.onclick = clearForm;
    
    const exportBtn = document.createElement('button');
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Экспорт';
    exportBtn.className = 'calculate-btn';
    exportBtn.style.cssText = 'background: #28a745; flex: 1;';
    exportBtn.onclick = exportResults;
    
    buttonContainer.appendChild(clearBtn);
    buttonContainer.appendChild(exportBtn);
    inputSection.appendChild(buttonContainer);
});

// Функция для демонстрации с примерными данными
function loadExampleData() {
    document.getElementById('units-sold').value = '100';
    document.getElementById('logistics').value = '25.50';
    document.getElementById('fulfillment').value = '15.00';
    document.getElementById('paid-acceptance').value = '8.00';
    document.getElementById('wb-commission').value = '15.5';
    document.getElementById('storage-cost').value = '5.00';
    document.getElementById('advertising').value = '50.00';
    document.getElementById('purchase-price').value = '200.00';
    document.getElementById('selling-price').value = '450.00';
    document.getElementById('redemption-rate').value = '85';
    
    calculateEconomics();
}

// Добавляем кнопку для загрузки примера
document.addEventListener('DOMContentLoaded', function() {
    // Находим существующий контейнер кнопок
    const buttonsContainer = document.querySelector('.header-buttons');
    
    // Создаем кнопку "Загрузить пример"
    const exampleBtn = document.createElement('button');
    exampleBtn.innerHTML = '<i class="fas fa-magic"></i> Загрузить пример';
    exampleBtn.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: 1px solid rgba(102, 126, 234, 0.3);
        padding: 12px 20px;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 600;
        margin-top: 0;
        margin-left: 0;
        transition: all 0.3s ease;
        font-size: 0.875rem;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        flex: 1;
        justify-content: center;
        box-shadow: 
            0 4px 16px rgba(102, 126, 234, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    `;
    exampleBtn.onclick = loadExampleData;
    exampleBtn.onmouseover = function() {
        this.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
    };
    exampleBtn.onmouseout = function() {
        this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
    };
    
    // Добавляем кнопку в существующий контейнер
    buttonsContainer.appendChild(exampleBtn);
});
