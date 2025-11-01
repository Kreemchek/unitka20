#!/bin/bash

# Скрипт для автоматического обновления GitHub репозитория
# Использование: ./update_github.sh [GITHUB_TOKEN]

cd "/Users/zalogudachi/Downloads/Архив/WebUnit-economik"

echo "🚀 Начинаю обновление GitHub репозитория..."

# Проверяем наличие git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен!"
    exit 1
fi

# Инициализируем git если нужно
if [ ! -d ".git" ]; then
    echo "📦 Инициализирую git репозиторий..."
    git init
    git remote add origin https://github.com/kreemchek/regerg24.git
fi

# Настраиваем remote
git remote set-url origin https://github.com/kreemchek/regerg24.git

# Настраиваем пользователя
git config user.name "kreemchek"
git config user.email "kreemchek@users.noreply.github.com"

# Добавляем файлы
echo "📝 Добавляю файлы..."
git add index.html script.js styles.css commission.xlsx .htaccess README.md

# Коммит
echo "💾 Создаю коммит..."
git commit -m "v2.0: Добавлен поиск товаров, автозаполнение комиссии, поддержка Excel, улучшенный дизайн для Telegram Web App" || echo "Нет изменений для коммита"

# Устанавливаем ветку
git branch -M main

# Push с токеном или через авторизацию
if [ -n "$1" ]; then
    echo "🔐 Использую предоставленный токен..."
    git push https://${1}@github.com/kreemchek/regerg24.git main
else
    echo "📤 Отправляю изменения на GitHub..."
    echo "💡 Если запросит пароль, используйте Personal Access Token (не обычный пароль)"
    echo "💡 Или запустите: ./update_github.sh YOUR_GITHUB_TOKEN"
    git push -u origin main
fi

echo "✅ Готово! Проверьте https://kreemchek.github.io/regerg24/"

