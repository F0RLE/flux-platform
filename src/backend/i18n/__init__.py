"""
Internationalization (i18n) for Flux Platform.
Supports: en, ru, zh
"""
import os
import json
import locale
from pathlib import Path
from typing import Dict, Optional

DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = ["en", "ru", "zh"]

_translations: Dict[str, Dict[str, str]] = {}
_current_language = DEFAULT_LANGUAGE


def detect_system_language() -> str:
    """Detect system language. Returns 'ru' for Russian, 'en' for others."""
    try:
        # Windows API (fastest)
        try:
            import ctypes
            lcid = ctypes.windll.kernel32.GetUserDefaultUILanguage()
            lang_id = lcid & 0x3FF
            if lang_id == 0x19:  # Russian
                return 'ru'
            if lang_id == 0x04:  # Chinese
                return 'zh'
        except Exception:
            pass
        
        # Environment variable
        lang = os.environ.get('LANG', '').split('_')[0].lower()
        if lang in SUPPORTED_LANGUAGES:
            return lang
        
        # System locale
        try:
            system_locale, _ = locale.getdefaultlocale()
            if system_locale:
                lang = system_locale.split('_')[0].lower()
                if lang in SUPPORTED_LANGUAGES:
                    return lang
        except Exception:
            pass
    except Exception:
        pass
    
    return 'en'


def load_translations(lang: str = None) -> Dict[str, str]:
    """Load translations for language."""
    global _translations
    
    if lang is None:
        lang = _current_language
    
    if lang not in SUPPORTED_LANGUAGES:
        lang = DEFAULT_LANGUAGE
    
    if lang in _translations:
        return _translations[lang]
    
    # Find locales directory
    locales_dir = Path(__file__).parent / "locales"
    if not locales_dir.exists():
        # Fallback to src/locales
        locales_dir = Path(__file__).parent.parent.parent / "locales"
    
    translations_file = locales_dir / f"{lang}.json"
    
    if translations_file.exists():
        try:
            with open(translations_file, 'r', encoding='utf-8-sig') as f:
                _translations[lang] = json.load(f)
                return _translations[lang]
        except Exception as e:
            print(f"[i18n] Failed to load {lang}: {e}")
    
    return {}


def set_language(lang: str) -> bool:
    """Set current language."""
    global _current_language
    if lang in SUPPORTED_LANGUAGES:
        _current_language = lang
        load_translations(lang)
        return True
    return False


def get_language() -> str:
    """Get current language code."""
    return _current_language


def t(key: str, default: Optional[str] = None, **kwargs) -> str:
    """
    Translate a key.
    
    Args:
        key: Translation key (e.g., "ui.title")
        default: Default if key not found
        **kwargs: Variables to substitute
    """
    translations = load_translations()
    text = translations.get(key, default or key)
    
    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, ValueError):
            pass
    
    return text


def init_i18n(lang: Optional[str] = None) -> str:
    """
    Initialize i18n.
    Returns language code set.
    """
    if lang is None:
        lang = detect_system_language()
    set_language(lang)
    return lang
