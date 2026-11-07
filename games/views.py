from django.http import Http404
from django.shortcuts import render

# Only list games that actually work. Add new games here later.
GAMES = [
    {
        "slug": "fruit-slicer",
        "title": "Fruit Slicer",
        "description": "Swipe to slice fruit, build combos, and avoid the bombs.",
        "controls": "Mouse: click and drag across the fruit. Touch: swipe across the fruit. Avoid the bombs.",
    },
]


def home(request):
    return render(request, "games/home.html", {"games": GAMES})


def play(request, slug):
    game = next((g for g in GAMES if g["slug"] == slug), None)
    if game is None:
        raise Http404("Game not found")
    return render(request, "games/play.html", {"game": game})


SITE_NAME = "Mini Game Arcade"
CONTACT_EMAIL = "usmanazhar2626@gmail.com"  
LAST_UPDATED = "November 7, 2026"


def _page(request, title, template):
    return render(request, template, {
        "title": title,
        "site_name": SITE_NAME,
        "contact_email": CONTACT_EMAIL,
        "updated": LAST_UPDATED,
    })


def about(request):
    return _page(request, "About", "games/pages/about.html")


def contact(request):
    return _page(request, "Contact", "games/pages/contact.html")


def privacy(request):
    return _page(request, "Privacy Policy", "games/pages/privacy.html")


def terms(request):
    return _page(request, "Terms of Use", "games/pages/terms.html")