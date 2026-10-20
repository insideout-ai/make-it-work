"""Business rules shared by checkout and refunds."""

import unittest


def discounted_total(amount, percentage):
    """Return the checkout total after a percentage discount.

    >>> discounted_total(100, 20)
    80.0
    """
    return amount * (1 - percentage / 100)


def refund_limit(balance):
    """UC-02 refunds cannot exceed the available balance."""
    return max(balance, 0)


class DiscountTests(unittest.TestCase):
    def test_twenty_percent_discount(self):
        self.assertEqual(discounted_total(100, 20), 80)

    def test_zero_discount(self):
        self.assertEqual(discounted_total(100, 0), 100)

    def test_hundred_percent_discount(self):
        self.assertEqual(discounted_total(100, 100), 0)
