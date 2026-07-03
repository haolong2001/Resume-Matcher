from app.schemas.models import Experience


def test_experience_description_bullets_default_to_true_for_existing_points():
    experience = Experience(description=["Built APIs", "Led delivery"])

    assert experience.descriptionBullets == [True, True]


def test_experience_description_bullets_trim_extra_values():
    experience = Experience(
        description=["Built APIs"],
        descriptionBullets=[True, False, True],
    )

    assert experience.descriptionBullets == [True]
