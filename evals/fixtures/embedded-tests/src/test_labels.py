import unittest

from src.labels import account_label


# @covers embedded-tests:UC-03 embedded-tests:domain-labels
class LabelTests(unittest.TestCase):
    def test_trims_label(self):
        self.assertEqual(account_label(" Main "), "Main")
