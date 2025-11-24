# Generated manually on 2025-11-17
# Rename location field to dorm_location to clarify it's for dorm locations only

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0005_listing_view_count"),
    ]

    operations = [
        migrations.RenameField(
            model_name="listing",
            old_name="location",
            new_name="dorm_location",
        ),
    ]
