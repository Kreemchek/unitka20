#!/usr/bin/env python3
"""
Telegram бот для калькулятора юнит-экономики (Wildberries)
Автор: @MaksimovWB
Переписан на aiogram v3
"""

import asyncio
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from html import escape as html_escape
from aiogram import Bot, Dispatcher, Router, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    BufferedInputFile,
)
from aiogram.exceptions import TelegramBadRequest

load_dotenv()

# Конфигурация
TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL')
ADMIN_CHAT_ID = os.getenv('ADMIN_CHAT_ID')
CHANNEL_ID = os.getenv('CHANNEL_ID')

if not TOKEN:
    raise RuntimeError('Не задан BOT_TOKEN в окружении (.env)')

# Инициализация бота/диспетчера
bot = Bot(TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN))
dp = Dispatcher()
router = Router()
dp.include_router(router)


def format_user_info(user) -> dict:
    """Форматирует информацию о пользователе."""
    username = f"@{user.username}" if getattr(user, 'username', None) else "без username"
    first_name = getattr(user, 'first_name', '') or ''
    last_name = getattr(user, 'last_name', '') or ''
    full_name = f"{first_name} {last_name}".strip()

    return {
        'id': user.id,
        'username': username,
        'full_name': full_name,
        'display_name': full_name if full_name else username,
    }


async def notify_admin(message_text: str) -> None:
    """Отправляет уведомление администратору."""
    if ADMIN_CHAT_ID:
        try:
            await bot.send_message(resolve_chat_id(ADMIN_CHAT_ID), message_text)
        except TelegramBadRequest as error:
            # Пробуем отправить безопасный текст без разметки
            try:
                safe_text = html_escape(message_text)
                await bot.send_message(resolve_chat_id(ADMIN_CHAT_ID), safe_text, parse_mode=ParseMode.HTML)
            except Exception as inner_error:
                print(f"Error sending admin notification (fallback failed): {inner_error}")
        except Exception as error:
            print(f"Error sending admin notification: {error}")


async def check_user_subscription(user_id: int) -> bool:
    """Проверяет подписку пользователя на канал."""
    if not CHANNEL_ID:
        return True  # Если канал не настроен, разрешаем доступ
    
    try:
        chat_id = resolve_chat_id(CHANNEL_ID)
        if chat_id is None:
            return True
        member = await bot.get_chat_member(chat_id, user_id)
        # Проверяем статус участника
        return member.status in ['member', 'administrator', 'creator']
    except TelegramBadRequest as error:
        # Частая причина: бот не админ в канале или неверный CHANNEL_ID
        print(
            "Error checking subscription for user {}: {}. "
            "Убедитесь, что бот добавлен в канал и имеет права администратора, "
            "а также что CHANNEL_ID задан как '@username' или '-100...'.".format(user_id, error)
        )
        return False
    except Exception as error:
        print(f"Error checking subscription for user {user_id}: {error}")
        return False  # При ошибке блокируем доступ


def resolve_chat_id(raw_value: str):
    """Возвращает chat_id для методов Telegram API из строки окружения.

    Поддерживает формы:
    - '@username' (возврат как строка)
    - '-100xxxxxxxxxx' (возврат как int)
    - 'xxxxxxxxxx' (попытка привести к int, иначе вернуть строкой)
    """
    if not raw_value:
        return None
    value = raw_value.strip()
    if value.startswith('@'):
        return value
    try:
        return int(value)
    except ValueError:
        return value


@router.message(Command('start'))
async def start_command(message: Message) -> None:
    """Обработчик команды /start."""
    # Проверяем подписку пользователя
    user_id = message.from_user.id
    is_subscribed = await check_user_subscription(user_id)
    
    if not is_subscribed:
        markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📢 Подписаться на канал",
                        url="https://t.me/MaksimovWB"
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="🔄 Проверить подписку",
                        callback_data=f"check_sub_{user_id}"
                    )
                ]
            ]
        )
        await message.answer(
            "👋 **Добро пожаловать в калькулятор юнит-экономики!**\n\n"
            "❌ Для использования калькулятора необходимо подписаться на канал @MaksimovWB\n\n"
            "📊 После подписки вы получите доступ к:\n"
            "• Расчету маржинальности и рентабельности\n"
            "• Прибыли при разных налоговых ставках\n"
            "• Учету всех расходов WB\n"
            "• Экспорту результатов\n\n"
            "🤖 **Создано @MaksimovWB** - эксперт по маркетплейсам",
            reply_markup=markup
        )
        return
    
    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🧮 Открыть калькулятор",
                    web_app=WebAppInfo(url=WEB_APP_URL or "")
                )
            ]
        ]
    )

    welcome_text = (
        "👋 *Добро пожаловать в калькулятор юнит-экономики!*\n\n"
        "Этот инструмент поможет вам рассчитать прибыльность товаров на Wildberries.\n\n"
        "📊 *Что вы можете рассчитать:*\n"
        "• Маржинальность и рентабельность\n"
        "• Прибыль при разных налоговых ставках (2%, 5%, 7%)\n"
        "• Все расходы WB (логистика, комиссии, хранение)\n"
        "• Эквайринг и налогообложение\n\n"
        "🎯 *Как использовать:*\n"
        "1. Нажмите кнопку \"Открыть калькулятор\"\n"
        "2. Заполните данные о товаре\n"
        "3. Получите детальный расчет\n"
        "4. Поделитесь результатами\n\n"
        "🤖 *Создано @MaksimovWB* - эксперт по маркетплейсам\n\n"
        "Нажмите кнопку ниже, чтобы начать расчеты!"
    )

    await message.answer(welcome_text, reply_markup=markup)

    user_info = format_user_info(message.from_user)
    admin_notification = (
        "🆕 *Новый пользователь запустил калькулятор!*\n\n"
        f"👤 *Пользователь:* {user_info['display_name']}\n"
        f"🆔 *ID:* `{user_info['id']}`\n"
        f"📱 *Username:* {user_info['username']}\n"
        f"🕐 *Время:* {message.date.strftime('%d.%m.%Y %H:%M:%S')}\n\n"
        "📊 *Калькулятор:* Юнит-экономика WB"
    )
    await notify_admin(admin_notification)


@router.message(Command('help'))
async def help_command(message: Message) -> None:
    """Обработчик команды /help."""
    # Проверяем подписку пользователя
    user_id = message.from_user.id
    is_subscribed = await check_user_subscription(user_id)
    
    if not is_subscribed:
        markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📢 Подписаться на канал",
                        url="https://t.me/MaksimovWB"
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="🔄 Проверить подписку",
                        callback_data=f"check_sub_{user_id}"
                    )
                ]
            ]
        )
        await message.answer(
            "❌ Для использования бота необходимо подписаться на канал @MaksimovWB",
            reply_markup=markup
        )
        return
    
    help_text = (
        "🆘 *Помощь по использованию калькулятора*\n\n"
        "📋 *Параметры для расчета:*\n"
        "• **Продано единиц** - количество проданного товара\n"
        "• **Логистика ВБ** - стоимость доставки (руб.)\n"
        "• **Фулфилмент** - стоимость обработки заказа (руб.)\n"
        "• **Комиссия ВБ** - процент комиссии маркетплейса (%)\n"
        "• **Стоимость хранения ВБ** - плата за хранение (руб.)\n"
        "• **Реклама** - расходы на продвижение (руб.)\n"
        "• **Закупочная цена товара** - себестоимость (руб.)\n"
        "• **Цена продажи** - розничная цена на WB (руб.)\n"
        "• **Процент выкупа** - доля выкупленных товаров (%)\n\n"
        "📈 *Результаты расчета:*\n"
        "• Маржинальность - отношение прибыли к выручке\n"
        "• Рентабельность - отношение прибыли к себестоимости\n"
        "• Прибыль при разных налоговых ставках\n\n"
        "💡 *Советы:*\n"
        "• Используйте реальные данные для точных расчетов\n"
        "• Учитывайте сезонность при расчете процента выкупа\n"
        "• Регулярно пересчитывайте при изменении комиссий WB\n\n"
        "🤖 *Поддержка:* @MaksimovWB"
    )

    await message.answer(help_text)


@router.message(Command('stats'))
async def stats_command(message: Message) -> None:
    """Обработчик команды /stats - только для админа."""
    is_admin = ADMIN_CHAT_ID and message.from_user and message.from_user.id == int(ADMIN_CHAT_ID)
    if is_admin:
        stats_text = (
            "📊 *Статистика калькулятора юнит-экономики*\n\n"
            "🤖 *Бот:* Активен и работает\n"
            f"🌐 *Web App:* {WEB_APP_URL}\n"
            f"🕐 *Время:* {message.date.strftime('%d.%m.%Y %H:%M:%S')}\n\n"
            "📈 *Функции:*\n"
            "✅ Расчет юнит-экономики\n"
            "✅ Экспорт данных\n"
            "✅ Платная приемка\n"
            "✅ Уведомления админу\n\n"
            "👨‍💻 *Создано:* [@MaksimovWB](https://t.me/MaksimovWB)"
        )
        await message.answer(stats_text)
    else:
        await message.answer("❌ Эта команда доступна только администратору.")


@router.message(Command('about'))
async def about_command(message: Message) -> None:
    """Обработчик команды /about."""
    # Проверяем подписку пользователя
    user_id = message.from_user.id
    is_subscribed = await check_user_subscription(user_id)
    
    if not is_subscribed:
        markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📢 Подписаться на канал",
                        url="https://t.me/MaksimovWB"
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="🔄 Проверить подписку",
                        callback_data=f"check_sub_{user_id}"
                    )
                ]
            ]
        )
        await message.answer(
            "❌ Для использования бота необходимо подписаться на канал @MaksimovWB",
            reply_markup=markup
        )
        return
    
    about_text = (
        "ℹ️ *О калькуляторе юнит-экономики*\n\n"
        "🎯 *Назначение:*\n"
        "Этот калькулятор создан для точного расчета прибыльности товаров на маркетплейсе Wildberries с учетом всех расходов и налогов.\n\n"
        "👨‍💻 *Автор:*\n"
        "[@MaksimovWB](https://t.me/MaksimovWB) - эксперт по работе с маркетплейсами\n\n"
        "🔧 *Технологии:*\n"
        "• HTML5, CSS3, JavaScript\n"
        "• Telegram Web Apps API\n"
        "• Адаптивный дизайн\n\n"
        "📊 *Особенности:*\n"
        "• Расчет для разных налоговых ставок\n"
        "• Учет всех расходов WB\n"
        "• Экспорт результатов\n"
        "• Современный интерфейс\n\n"
        "🚀 *Версия:* 1.0.0\n\n"
        "📞 *Связь:* [@MaksimovWB](https://t.me/MaksimovWB)"
    )
    await message.answer(about_text)


@router.message(Command('check'))
async def check_command(message: Message) -> None:
    """Диагностика: проверка подписки пользователя на канал из CHANNEL_ID."""
    user_id = message.from_user.id
    chat_display = CHANNEL_ID or 'не задан'
    is_subscribed = await check_user_subscription(user_id)
    status = '✅ есть подписка' if is_subscribed else '❌ нет подписки'
    await message.answer(
        "Проверка подписки:\n"
        f"Канал: {chat_display}\n"
        f"Пользователь: `{user_id}`\n"
        f"Статус: {status}"
    )


@router.message(F.web_app_data)
async def handle_web_app_data(message: Message) -> None:
    """Обработка данных, пришедших из Web App (Telegram Web Apps)."""
    try:
        data = json.loads(message.web_app_data.data)
        data_type = data.get('type')

        if data_type == 'unit_economics_results':
            results = data.get('data', {})
            message_text = data.get('message', 'Результаты расчета')

            await message.answer(message_text)

            user_info = format_user_info(message.from_user)
            print(f"Calculation shared by {user_info['display_name']}")

            admin_notification = (
                "📊 *Пользователь поделился расчетом!*\n\n"
                f"👤 *Пользователь:* {user_info['display_name']}\n"
                f"🆔 *ID:* `{user_info['id']}`\n"
                f"🕐 *Время:* {message.date.strftime('%d.%m.%Y %H:%M:%S')}\n"
                "🧮 *Действие:* Поделился результатами расчета"
            )
            await notify_admin(admin_notification)

        elif data_type == 'export_results':
            results = data.get('data', {})
            export_message = data.get('message', 'Экспорт данных')

            await message.answer(export_message)

            try:
                json_data = json.dumps(results, ensure_ascii=False, indent=2)
                filename = (
                    "unit_economics_export_"
                    + (results.get('timestamp') or datetime.now().strftime('%Y-%m-%d_%H-%M-%S'))
                    .replace(':', '-').replace(' ', '_').replace(',', '')
                    + ".json"
                )

                document = BufferedInputFile(json_data.encode('utf-8'), filename=filename)
                await bot.send_document(message.chat.id, document, caption="📎 Данные расчета в формате JSON для дальнейшего анализа")

            except Exception as file_error:
                print(f"Error sending JSON file: {file_error}")
                await message.answer("📊 Экспорт завершен! (JSON файл недоступен)")

            user_info = format_user_info(message.from_user)
            print(f"Data exported by {user_info['display_name']}")

            admin_notification = (
                "📤 *Пользователь экспортировал данные!*\n\n"
                f"👤 *Пользователь:* {user_info['display_name']}\n"
                f"🆔 *ID:* `{user_info['id']}`\n"
                f"🕐 *Время:* {message.date.strftime('%d.%m.%Y %H:%M:%S')}\n"
                "📊 *Действие:* Полный экспорт расчета\n"
                "💾 *Данные:* JSON файл отправлен"
            )
            await notify_admin(admin_notification)

    except json.JSONDecodeError:
        await message.answer("❌ Ошибка обработки данных. Попробуйте еще раз.")
    except Exception as error:
        print(f"Error handling web app data: {error}")
        await message.answer("❌ Произошла ошибка. Обратитесь к @MaksimovWB")


@router.callback_query(F.data.startswith('check_sub_'))
async def check_subscription_callback(callback: CallbackQuery) -> None:
    """Обработчик callback для проверки подписки."""
    user_id = callback.from_user.id
    is_subscribed = await check_user_subscription(user_id)

    try:
        if is_subscribed:
            # Чтобы избежать ошибки "message is not modified" меняем текст только при необходимости
            new_text = (
                "✅ Отлично! Подписка подтверждена!\n\n"
                "Теперь вы можете пользоваться калькулятором юнит-экономики.\n"
                "Нажмите /start чтобы открыть калькулятор."
            )
            if callback.message.text != new_text:
                await callback.message.edit_text(new_text)
            await callback.answer("✅ Подписка подтверждена!")
        else:
            markup = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="📢 Подписаться на канал",
                            url="https://t.me/MaksimovWB"
                        )
                    ],
                    [
                        InlineKeyboardButton(
                            text="🔄 Проверить еще раз",
                            callback_data=f"check_sub_{user_id}"
                        )
                    ]
                ]
            )
            new_text = (
                "❌ Подписка не найдена.\n\n"
                "Пожалуйста, подпишитесь на канал @MaksimovWB и нажмите 'Проверить еще раз'."
            )
            if callback.message.text != new_text:
                await callback.message.edit_text(new_text, reply_markup=markup)
            else:
                # Если текст тот же, безопасно обновим только разметку
                await callback.message.edit_reply_markup(reply_markup=markup)
            await callback.answer("❌ Подписка не найдена")
    except TelegramBadRequest as error:
        # На всякий случай, если все равно совпало содержимое
        await callback.answer("Проверьте подписку ещё раз", show_alert=False)


@router.message()
async def handle_other_messages(message: Message) -> None:
    """Ответ по умолчанию для обычных сообщений."""
    # Проверяем подписку для всех сообщений
    user_id = message.from_user.id
    is_subscribed = await check_user_subscription(user_id)
    
    if not is_subscribed:
        markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="📢 Подписаться на канал",
                        url="https://t.me/MaksimovWB"
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="🔄 Проверить подписку",
                        callback_data=f"check_sub_{user_id}"
                    )
                ]
            ]
        )
        await message.answer(
            "❌ Для использования бота необходимо подписаться на канал @MaksimovWB",
            reply_markup=markup
        )
        return
    
    await message.answer(
        "🤖 Используйте команды:\n"
        "/start - Запустить калькулятор\n"
        "/help - Помощь\n"
        "/about - О боте"
    )


async def main() -> None:
    print("🤖 Запуск бота калькулятора юнит-экономики...")
    print(f"🌐 Web App URL: {WEB_APP_URL}")
    print(f"👨‍💻 Admin ID: {ADMIN_CHAT_ID if ADMIN_CHAT_ID else 'Не настроен'}")
    print(f"📢 Channel ID: {CHANNEL_ID if CHANNEL_ID else 'Не настроен'}")

    if ADMIN_CHAT_ID:
        startup_message = (
            "🚀 *Бот калькулятора запущен!*\n\n"
            "✅ Бот успешно запущен и готов к работе\n"
            "📊 Калькулятор юнит-экономики WB\n"
            f"🕐 Время запуска: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"
        )
        await notify_admin(startup_message)

    print("✅ Бот запущен и ожидает сообщений...")
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())