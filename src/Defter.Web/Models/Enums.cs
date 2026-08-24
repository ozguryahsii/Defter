namespace Defter.Web.Models;

/// <summary>Purpose of an expense group.</summary>
public enum GroupType
{
    /// <summary>A trip / social group where costs are usually split evenly.</summary>
    Tatil = 0,

    /// <summary>A joint venture where costs may be split by ownership shares.</summary>
    Girisim = 1
}

/// <summary>How a single expense is divided among its participants.</summary>
public enum SplitType
{
    /// <summary>Split equally among the selected participants.</summary>
    Equal = 0,

    /// <summary>Each participant is assigned an exact amount that sums to the total.</summary>
    Exact = 1
}
