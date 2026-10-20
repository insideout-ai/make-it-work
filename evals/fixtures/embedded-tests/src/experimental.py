"""Experimental account helper; no production callers or documented UC yet."""

import unittest


def round_amount(value):
    return round(value, 2)


class HelperTests(unittest.TestCase):
    def test_rounding(self):
        self.assertEqual(round_amount(1.234), 1.23)
