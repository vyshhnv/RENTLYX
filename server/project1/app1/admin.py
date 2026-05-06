from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Seller, Properties

# --- 1. Custom Admin for Seller ---
class SellerAdmin(admin.ModelAdmin):
    # Columns to show in the list
    list_display = ('user', 'phone', 'address', 'is_verified')
    # Add filters on the right side
    list_filter = ('is_verified',)
    # Add a search bar
    search_fields = ('user__username', 'phone')

# --- 2. Custom Admin for Properties ---
class PropertiesAdmin(admin.ModelAdmin):
    # Columns to show in the list
    list_display = ('name', 'property_place', 'price', 'seller')
    # Add filters
    list_filter = ('property_place',)
    # Add search bar
    search_fields = ('name', 'property_place')

# Register your models with the custom configs
admin.site.register(Seller, SellerAdmin)
admin.site.register(Properties, PropertiesAdmin)