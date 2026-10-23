import unittest

from src.labels import account_label


class LabelTests(unittest.TestCase):
    def test_trims_label(self):
        self.assertEqual(account_label(" Main "), "Main")
