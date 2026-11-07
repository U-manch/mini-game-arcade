from django.urls import path
from . import views

app_name = "games"

urlpatterns = [
    path("", views.home, name="home"),
    path("play/<slug:slug>/", views.play, name="play"),
    path("about/", views.about, name="about"),
    path("contact/", views.contact, name="contact"),
    path("privacy/", views.privacy, name="privacy"),
    path("terms/", views.terms, name="terms"),
]