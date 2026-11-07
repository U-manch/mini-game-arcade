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


def _page(request, title):
    return render(request, "games/page.html", {"title": title})


def about(request):
    return _page(request, "About")


def contact(request):
    return _page(request, "Contact")


def privacy(request):
    return _page(request, "Privacy Policy")


def terms(request):
    return _page(request, "Terms of Use")